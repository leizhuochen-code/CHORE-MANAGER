/**
 * 全局状态 —— zustand + persist（localStorage）。
 * 所有杂务 CRUD 都经过这里；实例的生成/重建/自动扩展语义集中在此实现。
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Member, Chore, ChoreInstance, ChoreInput } from '../types';
import { uuid, todayKey, addDaysKey, maxKey } from '../lib/dates';
import { planInstancesForChore, computeCoverageTarget, rulesEqual } from '../lib/recurrence';
import { MATERIALIZE_HORIZON_DAYS } from '../constants';
import { seedMembers, buildSeedChores } from '../lib/seed';

export interface StoreState {
  members: Member[];
  chores: Chore[];
  instances: ChoreInstance[];
  seeded: boolean;

  // ---- 成员 ----
  addMember(data: Omit<Member, 'id' | 'createdAt'>): void;
  updateMember(id: string, patch: Partial<Member>): void;
  /** 删除成员：从所有杂务中摘除其分配，清空完成人引用 */
  removeMember(id: string): void;

  // ---- 杂务 ----
  addChore(input: ChoreInput): void;
  /** 编辑杂务；若触及循环本身则按再生语义重建实例 */
  updateChore(id: string, patch: Partial<ChoreInput>): void;
  /** 删除杂务：级联删除全部实例（含已完成） */
  deleteChore(id: string): void;

  // ---- 实例 ----
  toggleComplete(instanceId: string, completedBy?: string): void;
  /** 只修改完成人，不改变完成状态 */
  setCompleter(instanceId: string, completedBy: string): void;
  /** 单次改期（仅未完成实例；非循环任务同步 startDate 与 dueTime） */
  updateInstanceDate(instanceId: string, newDueDate: string, newDueTime?: string): void;
  /** 删除单次实例（非循环任务的唯一实例由 UI 阻止） */
  deleteInstance(instanceId: string): void;

  // ---- 重复/种子 ----
  /** 自动扩展：把循环杂务的实例覆盖到 throughKey */
  ensureInstancesCovered(throughKey: string): void;
  /** 首次运行灌入示例数据（幂等） */
  seedIfEmpty(): void;
  /** 清空并重新灌入示例数据 */
  resetAll(): void;
}

/** 被 persist 持久化的数据子集 */
interface PersistedState {
  members: Member[];
  chores: Chore[];
  instances: ChoreInstance[];
  seeded: boolean;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      members: [],
      chores: [],
      instances: [],
      seeded: false,

      // ---------- 成员 ----------
      addMember: (data) =>
        set((s) => ({
          members: [...s.members, { ...data, id: uuid(), createdAt: new Date().toISOString() }],
        })),

      updateMember: (id, patch) =>
        set((s) => ({
          members: s.members.map((m) => (m.id === id ? { ...m, ...patch, id } : m)),
        })),

      removeMember: (id) =>
        set((s) => ({
          members: s.members.filter((m) => m.id !== id),
          chores: s.chores.map((c) => ({
            ...c,
            assigneeIds: c.assigneeIds.filter((a) => a !== id),
          })),
          instances: s.instances.map((i) =>
            i.completedBy === id ? { ...i, completedBy: undefined } : i,
          ),
        })),

      // ---------- 杂务 ----------
      addChore: (input) =>
        set((s) => {
          const chore: Chore = {
            id: uuid(),
            title: input.title.trim(),
            description: input.description,
            isRecurring: input.isRecurring,
            recurrence: input.recurrence,
            assigneeIds: input.assigneeIds,
            startDate: input.startDate,
            dueTime: input.dueTime,
            createdAt: new Date().toISOString(),
          };
          const { instances: gen, generatedThrough } = planInstancesForChore(chore, new Set());
          chore.generatedThrough = generatedThrough;
          return {
            chores: [...s.chores, chore],
            instances: [...s.instances, ...gen],
          };
        }),

      updateChore: (id, patch) =>
        set((s) => {
          const chore = s.chores.find((c) => c.id === id);
          if (!chore) return s;
          const merged: Chore = {
            ...chore,
            title: patch.title?.trim() ?? chore.title,
            description: patch.description,
            isRecurring: patch.isRecurring ?? chore.isRecurring,
            recurrence: patch.recurrence,
            assigneeIds: patch.assigneeIds ?? chore.assigneeIds,
            startDate: patch.startDate ?? chore.startDate,
            dueTime: patch.dueTime,
          };

          // 是否触及循环本身？
          const recChanged =
            merged.isRecurring !== chore.isRecurring ||
            merged.startDate !== chore.startDate ||
            !rulesEqual(merged.recurrence, chore.recurrence);

          if (!recChanged) {
            return { chores: s.chores.map((c) => (c.id === id ? merged : c)) };
          }

          // 再生语义：
          // 1. 删除旧规则生成的「未来未完成」实例；保留已完成的（历史）与逾期未办（<=今天）
          const today = todayKey();
          const kept = s.instances.filter(
            (i) => i.choreId !== id || i.completed || i.dueDate <= today,
          );
          // 2. 新规则从 max(startDate, today) 起生成，按日期去重跳过已占用
          const existing = new Set(kept.filter((i) => i.choreId === id).map((i) => i.dueDate));
          const from = maxKey(merged.startDate, today);
          let newInstances: ChoreInstance[] = [];
          let generatedThrough: string | undefined;

          if (merged.isRecurring && merged.recurrence) {
            const target = computeCoverageTarget(
              merged.recurrence,
              merged.startDate,
              undefined,
              addDaysKey(merged.startDate, MATERIALIZE_HORIZON_DAYS),
            );
            if (target) {
              newInstances = planInstancesForChore(
                { ...merged, generatedThrough: undefined },
                existing,
              ).instances.filter((i) => i.dueDate >= from && !existing.has(i.dueDate));
              generatedThrough = target;
            } else {
              generatedThrough = merged.startDate;
            }
          } else {
            // 变为非循环：确保 startDate 恰有一个实例
            generatedThrough = merged.startDate;
            if (!existing.has(merged.startDate)) {
              newInstances = [
                { id: uuid(), choreId: merged.id, dueDate: merged.startDate, completed: false },
              ];
            }
          }

          return {
            chores: s.chores.map((c) => (c.id === id ? { ...merged, generatedThrough } : c)),
            instances: [...kept, ...newInstances],
          };
        }),

      deleteChore: (id) =>
        set((s) => ({
          chores: s.chores.filter((c) => c.id !== id),
          instances: s.instances.filter((i) => i.choreId !== id),
        })),

      // ---------- 实例 ----------
      toggleComplete: (instanceId, completedBy) =>
        set((s) => ({
          instances: s.instances.map((i) =>
            i.id === instanceId
              ? i.completed
                ? { ...i, completed: false, completedBy: undefined, completedAt: undefined }
                : {
                    ...i,
                    completed: true,
                    completedBy,
                    completedAt: new Date().toISOString(),
                  }
              : i,
          ),
        })),

      setCompleter: (instanceId, completedBy) =>
        set((s) => ({
          instances: s.instances.map((i) =>
            i.id === instanceId && i.completed ? { ...i, completedBy } : i,
          ),
        })),

      updateInstanceDate: (instanceId, newDueDate, newDueTime) =>
        set((s) => {
          const inst = s.instances.find((i) => i.id === instanceId);
          if (!inst || inst.completed) return s;
          const chore = s.chores.find((c) => c.id === inst.choreId);

          // 非循环任务：时间是整任务属性，instance 恒继承（避免双源）
          if (chore && !chore.isRecurring) {
            if (inst.dueDate === newDueDate && newDueTime === chore.dueTime) return s;
            const next = s.instances.map((i) =>
              i.id === instanceId ? { ...i, dueDate: newDueDate, dueTime: undefined } : i,
            );
            return {
              instances: next,
              chores: s.chores.map((c) =>
                c.id === chore.id
                  ? { ...c, startDate: newDueDate, dueTime: newDueTime, generatedThrough: newDueDate }
                  : c,
              ),
            };
          }

          // 循环任务：单次覆盖；与模板一致或未提供时清空覆盖（回落继承模板）
          const tpl = chore?.dueTime;
          const override = newDueTime === undefined || newDueTime === tpl ? undefined : newDueTime;
          const effectiveNew = override ?? tpl;
          const effectiveOld = inst.dueTime ?? tpl;
          if (inst.dueDate === newDueDate && effectiveNew === effectiveOld) return s;
          const next = s.instances.map((i) =>
            i.id === instanceId ? { ...i, dueDate: newDueDate, dueTime: override } : i,
          );
          return { instances: next };
        }),

      deleteInstance: (instanceId) =>
        set((s) => {
          const inst = s.instances.find((i) => i.id === instanceId);
          if (!inst) return s;
          const chore = s.chores.find((c) => c.id === inst.choreId);
          // 非循环任务的唯一实例不允许删除（UI 会提示先删整个任务）
          if (chore && !chore.isRecurring) {
            const siblings = s.instances.filter(
              (i) => i.choreId === chore.id && i.id !== instanceId,
            );
            if (siblings.length === 0) return s;
          }
          return { instances: s.instances.filter((i) => i.id !== instanceId) };
        }),

      // ---------- 自动扩展 ----------
      ensureInstancesCovered: (throughKey) =>
        set((s) => {
          let chores = s.chores;
          let instances = s.instances;
          let changed = false;

          for (const chore of chores) {
            if (!chore.isRecurring || !chore.recurrence) continue;
            const target = computeCoverageTarget(
              chore.recurrence,
              chore.startDate,
              chore.generatedThrough,
              throughKey,
            );
            if (!target) continue;

            const existing = new Set(
              instances.filter((i) => i.choreId === chore.id).map((i) => i.dueDate),
            );
            const from = chore.generatedThrough
              ? addDaysKey(chore.generatedThrough, 1)
              : chore.startDate;

            const gen = planInstancesForChore(
              { ...chore, generatedThrough: undefined },
              existing,
            ).instances.filter((i) => i.dueDate >= from);

            if (gen.length) instances = [...instances, ...gen];
            chores = chores.map((c) =>
              c.id === chore.id ? { ...c, generatedThrough: target } : c,
            );
            changed = true;
          }

          return changed ? { chores, instances } : s;
        }),

      // ---------- 种子数据 ----------
      seedIfEmpty: () =>
        set((s) => {
          if (s.seeded) return s;
          const members = seedMembers.map((m) => ({
            ...m,
            id: uuid(),
            createdAt: new Date().toISOString(),
          }));
          const chores: Chore[] = [];
          const instances: ChoreInstance[] = [];
          for (const input of buildSeedChores(members)) {
            const chore: Chore = {
              id: uuid(),
              ...input,
              createdAt: new Date().toISOString(),
            };
            const { instances: gen, generatedThrough } = planInstancesForChore(chore, new Set());
            chore.generatedThrough = generatedThrough;
            chores.push(chore);
            instances.push(...gen);
          }
          return { members, chores, instances, seeded: true };
        }),

      resetAll: () => {
        // 先清空，再重灌种子（两次 set，第二次才能看到 seeded=false）
        set({ members: [], chores: [], instances: [], seeded: false });
        useStore.getState().seedIfEmpty();
      },
    }),
    {
      name: 'chore-manager:v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s): PersistedState => ({
        members: s.members,
        chores: s.chores,
        instances: s.instances,
        seeded: s.seeded,
      }),
      migrate: (persisted, version) => {
        if (version === 0) {
          // v0 -> v1 的迁移预留；当前无历史数据需要处理
        }
        return persisted as PersistedState;
      },
    },
  ),
);

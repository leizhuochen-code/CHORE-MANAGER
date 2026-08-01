import { Avatar, Tooltip } from 'antd';
import type { Member } from '../types';

/** 带 Tooltip 的头像（emoji 或姓名首字） */
export default function AvatarChip({
  member,
  size = 24,
}: {
  member: Member;
  size?: number;
}) {
  return (
    <Tooltip title={`${member.name}${member.role ? ` · ${member.role}` : ''}`}>
      <Avatar style={{ backgroundColor: member.avatarColor }} size={size}>
        {member.avatarEmoji || member.name.slice(0, 1)}
      </Avatar>
    </Tooltip>
  );
}

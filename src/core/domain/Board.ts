/**
 * HappyTF Domain Model: Board Entity
 * Hexagonal Architecture - Domain Core
 */

import { BoardSummary, BoardGroup, BoardColumn } from '@/types';

export class BoardEntity {
  constructor(
    public readonly id: string,
    public readonly workspaceId: string,
    public name: string,
    public iconEmoji: string,
    public color: string,
    public description: string,
    public groups: BoardGroup[],
    public columns: BoardColumn[],
    public updatedAt: string = new Date().toISOString()
  ) {}

  public addGroup(name: string, color: string): BoardGroup {
    const newGroup: BoardGroup = {
      id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      board_id: this.id,
      name,
      color,
    };
    this.groups.push(newGroup);
    this.updatedAt = new Date().toISOString();
    return newGroup;
  }

  public renameGroup(groupId: string, newName: string): boolean {
    const group = this.groups.find(g => g.id === groupId);
    if (!group) return false;
    group.name = newName;
    this.updatedAt = new Date().toISOString();
    return true;
  }

  public toSummary(itemCount: number = 0): BoardSummary {
    return {
      id: this.id,
      workspace_id: this.workspaceId,
      name: this.name,
      icon_emoji: this.iconEmoji,
      color: this.color,
      description: this.description,
      item_count: itemCount,
      updated_at: this.updatedAt,
      columns: this.columns,
    };
  }
}

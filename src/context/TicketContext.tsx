'use client';

/**
 * Ticket Domain Context & Hook
 * Hexagonal State Slice for Ticket CRUD, OCC Concurrency, and Item Comments
 */

import { useApp } from './AppContext';

export function useTickets() {
  const app = useApp();

  return {
    boardItems: app.boardItems,
    allWorkspaceItems: app.allWorkspaceItems,
    selectedItem: app.selectedItem,
    openItemDetail: app.openItemDetail,
    closeItemDetail: app.closeItemDetail,
    addBoardItem: app.addBoardItem,
    updateBoardItem: app.updateBoardItem,
    deleteBoardItem: app.deleteBoardItem,
    claimBoardItem: app.claimBoardItem,
    addItemComment: app.addItemComment,
    deleteItemComment: app.deleteItemComment,
    toggleCommentReaction: app.toggleCommentReaction,
    addSubItem: app.addSubItem,
    updateSubItem: app.updateSubItem,
    deleteSubItem: app.deleteSubItem,
  };
}

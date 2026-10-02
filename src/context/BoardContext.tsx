'use client';

/**
 * Board Domain Context & Hook
 * Hexagonal State Slice for Boards, Groups, and Dynamic Columns
 */

import { useApp } from './AppContext';

export function useBoard() {
  const app = useApp();

  return {
    activeBoardId: app.activeBoardId,
    activeBoard: app.activeBoard,
    boardViewMode: app.boardViewMode,
    setBoardViewMode: app.setBoardViewMode,
    boardGroups: app.boardGroups,
    boardColumns: app.boardColumns,
    recentBoards: app.recentBoards,
    folders: app.folders,
    navigateToBoard: app.navigateToBoard,
    createBoard: app.createBoard,
    joinBoard: app.joinBoard,
    toggleGroupCollapse: app.toggleGroupCollapse,
    addBoardColumn: app.addBoardColumn,
    createFolder: app.createFolder,
    deleteFolder: app.deleteFolder,
    moveBoardToFolder: app.moveBoardToFolder,
  };
}

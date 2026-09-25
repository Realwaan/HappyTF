import { NextRequest, NextResponse } from 'next/server';
import { 
  evaluateFormula, 
  calculateBoardAggregation, 
  speedLayerGetBoardAgg, 
  speedLayerSetBoardAgg 
} from '../../../lib/mondaydb';
import { BoardItem } from '../../../types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/mondaydb
 * Executes backend mondayDB formula calculations or returns cached columnar aggregations
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, formula, context, boardId, items } = body;

    // 1. Evaluate formula on server side (shares exact same logic as browser)
    if (action === 'evaluate-formula') {
      const result = evaluateFormula(formula, context || {});
      return NextResponse.json({
        success: true,
        engine: 'mondayDB Isomorphic JS',
        formula,
        result,
      });
    }

    // 2. Compute or fetch from Speed Layer (Redis)
    if (action === 'aggregate-board') {
      if (boardId) {
        const cached = await speedLayerGetBoardAgg(boardId);
        if (cached) {
          return NextResponse.json({
            success: true,
            source: 'speed-layer-redis',
            aggregation: cached,
          });
        }
      }

      const boardItems = (items as BoardItem[]) || [];
      const aggregation = calculateBoardAggregation(boardItems);

      if (boardId) {
        await speedLayerSetBoardAgg(boardId, aggregation);
      }

      return NextResponse.json({
        success: true,
        source: 'computed-batch',
        aggregation,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

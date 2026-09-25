/**
 * mondayDB Architecture: Isomorphic Formula Evaluation Engine
 * 
 * Safely parses and evaluates formulas without using `eval()`.
 * Runs identically in browser memory (0ms optimistic updates)
 * and in Node.js server microservices.
 * 
 * Examples:
 *   "{Estimate} - {Spent}"
 *   "{Points} * 1.5"
 *   "IF({Status} = 'Done', 100, 0)"
 *   "CONCAT({Title}, ' (', {Priority}, ')')"
 *   "ROUND({Revenue} / {Cost}, 2)"
 */

export interface FormulaContext {
  [columnNameOrId: string]: string | number | boolean | null | undefined;
}

type TokenType = 
  | 'NUMBER' 
  | 'STRING' 
  | 'VARIABLE' 
  | 'OPERATOR' 
  | 'FUNCTION' 
  | 'COMMA' 
  | 'LPAREN' 
  | 'RPAREN';

interface Token {
  type: TokenType;
  value: string;
}

// Tokenizer
export function tokenizeFormula(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = expr.length;

  while (i < n) {
    const ch = expr[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Variable: {Column Name}
    if (ch === '{') {
      const closeIdx = expr.indexOf('}', i);
      if (closeIdx === -1) {
        throw new Error(`Unclosed variable bracket at position ${i}`);
      }
      const varName = expr.slice(i + 1, closeIdx).trim();
      tokens.push({ type: 'VARIABLE', value: varName });
      i = closeIdx + 1;
      continue;
    }

    // String literal: '...' or "..."
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let str = '';
      i++;
      while (i < n && expr[i] !== quote) {
        str += expr[i];
        i++;
      }
      i++; // skip closing quote
      tokens.push({ type: 'STRING', value: str });
      continue;
    }

    // Number literal
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(expr[i + 1] || ''))) {
      let numStr = '';
      while (i < n && /[0-9.]/.test(expr[i])) {
        numStr += expr[i];
        i++;
      }
      tokens.push({ type: 'NUMBER', value: numStr });
      continue;
    }

    // Operators and delimiters
    if (ch === '(') {
      tokens.push({ type: 'LPAREN', value: '(' });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'RPAREN', value: ')' });
      i++;
      continue;
    }
    if (ch === ',') {
      tokens.push({ type: 'COMMA', value: ',' });
      i++;
      continue;
    }

    // Two-character operators
    const two = expr.slice(i, i + 2);
    if (['<=', '>=', '!=', '=='].includes(two)) {
      tokens.push({ type: 'OPERATOR', value: two === '==' ? '=' : two });
      i += 2;
      continue;
    }

    // Single-character operators
    if (['+', '-', '*', '/', '%', '=', '>', '<'].includes(ch)) {
      tokens.push({ type: 'OPERATOR', value: ch });
      i++;
      continue;
    }

    // Identifiers / Function names (IF, SUM, AVG, ROUND, CONCAT, DAYS, MIN, MAX, ABS)
    if (/[a-zA-Z_]/.test(ch)) {
      let ident = '';
      while (i < n && /[a-zA-Z0-9_]/.test(expr[i])) {
        ident += expr[i];
        i++;
      }
      tokens.push({ type: 'FUNCTION', value: ident.toUpperCase() });
      continue;
    }

    // Unrecognized character
    i++;
  }

  return tokens;
}

// AST Nodes
export type ASTNode =
  | { type: 'Literal'; value: string | number | boolean }
  | { type: 'Variable'; name: string }
  | { type: 'BinaryOp'; operator: string; left: ASTNode; right: ASTNode }
  | { type: 'FunctionCall'; name: string; args: ASTNode[] };

// Recursive Descent Parser
class FormulaParser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(): Token {
    return this.tokens[this.pos++];
  }

  parse(): ASTNode {
    const node = this.parseExpression();
    return node;
  }

  // Expression: comparison (=, !=, >, <, >=, <=)
  private parseExpression(): ASTNode {
    let left = this.parseAdditive();

    while (this.peek() && this.peek()!.type === 'OPERATOR' && ['=', '!=', '>', '<', '>=', '<='].includes(this.peek()!.value)) {
      const op = this.consume().value;
      const right = this.parseAdditive();
      left = { type: 'BinaryOp', operator: op, left, right };
    }

    return left;
  }

  // Additive: + and -
  private parseAdditive(): ASTNode {
    let left = this.parseMultiplicative();

    while (this.peek() && this.peek()!.type === 'OPERATOR' && ['+', '-'].includes(this.peek()!.value)) {
      const op = this.consume().value;
      const right = this.parseMultiplicative();
      left = { type: 'BinaryOp', operator: op, left, right };
    }

    return left;
  }

  // Multiplicative: *, /, %
  private parseMultiplicative(): ASTNode {
    let left = this.parsePrimary();

    while (this.peek() && this.peek()!.type === 'OPERATOR' && ['*', '/', '%'].includes(this.peek()!.value)) {
      const op = this.consume().value;
      const right = this.parsePrimary();
      left = { type: 'BinaryOp', operator: op, left, right };
    }

    return left;
  }

  // Primary: Literals, Variables, Functions, Parenthesized expressions
  private parsePrimary(): ASTNode {
    const token = this.peek();
    if (!token) {
      return { type: 'Literal', value: 0 };
    }

    if (token.type === 'NUMBER') {
      this.consume();
      return { type: 'Literal', value: parseFloat(token.value) };
    }

    if (token.type === 'STRING') {
      this.consume();
      return { type: 'Literal', value: token.value };
    }

    if (token.type === 'VARIABLE') {
      this.consume();
      return { type: 'Variable', name: token.value };
    }

    if (token.type === 'FUNCTION') {
      const fnName = this.consume().value;
      if (this.peek() && this.peek()!.type === 'LPAREN') {
        this.consume(); // eat '('
        const args: ASTNode[] = [];
        if (this.peek() && this.peek()!.type !== 'RPAREN') {
          args.push(this.parseExpression());
          while (this.peek() && this.peek()!.type === 'COMMA') {
            this.consume(); // eat ','
            args.push(this.parseExpression());
          }
        }
        if (this.peek() && this.peek()!.type === 'RPAREN') {
          this.consume(); // eat ')'
        }
        return { type: 'FunctionCall', name: fnName, args };
      }
      return { type: 'Literal', value: fnName };
    }

    if (token.type === 'LPAREN') {
      this.consume(); // eat '('
      const expr = this.parseExpression();
      if (this.peek() && this.peek()!.type === 'RPAREN') {
        this.consume(); // eat ')'
      }
      return expr;
    }

    // Fallback
    this.consume();
    return { type: 'Literal', value: 0 };
  }
}

// AST Evaluator
export function evaluateAST(node: ASTNode, context: FormulaContext): string | number | boolean {
  switch (node.type) {
    case 'Literal':
      return node.value;

    case 'Variable': {
      const val = context[node.name] ?? context[node.name.toLowerCase()] ?? 0;
      if (typeof val === 'number' || typeof val === 'boolean' || typeof val === 'string') {
        return val;
      }
      return 0;
    }

    case 'BinaryOp': {
      const leftVal = evaluateAST(node.left, context);
      const rightVal = evaluateAST(node.right, context);

      switch (node.operator) {
        case '+':
          if (typeof leftVal === 'string' || typeof rightVal === 'string') {
            return String(leftVal) + String(rightVal);
          }
          return Number(leftVal) + Number(rightVal);
        case '-':
          return Number(leftVal) - Number(rightVal);
        case '*':
          return Number(leftVal) * Number(rightVal);
        case '/': {
          const denominator = Number(rightVal);
          return denominator === 0 ? 0 : Number(leftVal) / denominator;
        }
        case '%':
          return Number(leftVal) % Number(rightVal);
        case '=':
          return leftVal == rightVal;
        case '!=':
          return leftVal != rightVal;
        case '>':
          return Number(leftVal) > Number(rightVal);
        case '<':
          return Number(leftVal) < Number(rightVal);
        case '>=':
          return Number(leftVal) >= Number(rightVal);
        case '<=':
          return Number(leftVal) <= Number(rightVal);
        default:
          return 0;
      }
    }

    case 'FunctionCall': {
      const evaluatedArgs = node.args.map((arg) => evaluateAST(arg, context));

      switch (node.name) {
        case 'IF': {
          const condition = Boolean(evaluatedArgs[0]);
          return condition ? (evaluatedArgs[1] ?? true) : (evaluatedArgs[2] ?? false);
        }
        case 'SUM': {
          return evaluatedArgs.reduce((acc: number, cur) => acc + (Number(cur) || 0), 0);
        }
        case 'AVG': {
          if (evaluatedArgs.length === 0) return 0;
          const sum = evaluatedArgs.reduce((acc: number, cur) => acc + (Number(cur) || 0), 0);
          return sum / evaluatedArgs.length;
        }
        case 'ROUND': {
          const val = Number(evaluatedArgs[0]) || 0;
          const precision = Number(evaluatedArgs[1]) || 0;
          const factor = Math.pow(10, precision);
          return Math.round(val * factor) / factor;
        }
        case 'CONCAT': {
          return evaluatedArgs.map((a) => String(a ?? '')).join('');
        }
        case 'MIN': {
          const nums = evaluatedArgs.map((a) => Number(a) || 0);
          return nums.length ? Math.min(...nums) : 0;
        }
        case 'MAX': {
          const nums = evaluatedArgs.map((a) => Number(a) || 0);
          return nums.length ? Math.max(...nums) : 0;
        }
        case 'ABS': {
          return Math.abs(Number(evaluatedArgs[0]) || 0);
        }
        case 'DAYS': {
          // DAYS(due_date, created_date) or DAYS(due_date)
          const d1 = new Date(String(evaluatedArgs[0])).getTime();
          const d2 = evaluatedArgs[1] ? new Date(String(evaluatedArgs[1])).getTime() : Date.now();
          if (isNaN(d1) || isNaN(d2)) return 0;
          return Math.round((d1 - d2) / (1000 * 3600 * 24));
        }
        default:
          return evaluatedArgs[0] ?? 0;
      }
    }
  }
}

/**
 * Top-level formula evaluator
 */
export function evaluateFormula(formula: string, context: FormulaContext): string | number | boolean {
  if (!formula || !formula.trim()) return '';
  try {
    const tokens = tokenizeFormula(formula);
    const parser = new FormulaParser(tokens);
    const ast = parser.parse();
    return evaluateAST(ast, context);
  } catch (error) {
    console.warn(`[mondayDB] Formula execution error for "${formula}":`, error);
    return '#ERROR';
  }
}

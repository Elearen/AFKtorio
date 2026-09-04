export const technologyLevelFor = (technologyName: string) => {
  const level = technologyName.match(/-(\d+)$/)?.[1];
  return level ? Number(level) : 1;
};

export const evaluateResearchCountFormula = (formula: string, level: number): number | null => {
  const expression = formula.replace(/\s+/g, '');
  const tokens = expression.match(/L|\d+(?:\.\d+)?|[()+\-*/^]/g);
  if (!tokens || tokens.join('') !== expression) return null;

  let position = 0;
  const peek = () => tokens[position];
  const parseExpression = (): number | null => {
    let value = parseTerm();
    while (value !== null && (peek() === '+' || peek() === '-')) {
      const operator = tokens[position++];
      const right = parseTerm();
      if (right === null) return null;
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  };
  const parseTerm = (): number | null => {
    let value = parsePower();
    while (value !== null && (peek() === '*' || peek() === '/')) {
      const operator = tokens[position++];
      const right = parsePower();
      if (right === null) return null;
      value = operator === '*' ? value * right : value / right;
    }
    return value;
  };
  const parsePower = (): number | null => {
    const base = parseUnary();
    if (base === null) return null;
    if (peek() !== '^') return base;
    position += 1;
    const exponent = parsePower();
    return exponent === null ? null : base ** exponent;
  };
  const parseUnary = (): number | null => {
    if (peek() === '+') {
      position += 1;
      return parseUnary();
    }
    if (peek() === '-') {
      position += 1;
      const value = parseUnary();
      return value === null ? null : -value;
    }
    return parsePrimary();
  };
  const parsePrimary = (): number | null => {
    const token = peek();
    if (!token) return null;
    if (token === 'L') {
      position += 1;
      return level;
    }
    if (token === '(') {
      position += 1;
      const value = parseExpression();
      if (peek() !== ')') return null;
      position += 1;
      return value;
    }
    if (/^\d+(?:\.\d+)?$/.test(token)) {
      position += 1;
      return Number(token);
    }
    return null;
  };

  const result = parseExpression();
  return result !== null && position === tokens.length && Number.isFinite(result) ? Math.round(result) : null;
};
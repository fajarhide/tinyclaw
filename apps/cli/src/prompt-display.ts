export function formatInputForDisplay(value: string): string {
  return normalizePastedText(value);
}

export function normalizePastedText(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}

function wrapTextSegment(
  text: string,
  firstLineCapacity: number,
  continuationLineCapacity: number,
): string[] {
  if (text.length === 0) {
    return [];
  }

  const lines: string[] = [];
  let index = 0;
  let capacity = firstLineCapacity;

  while (index < text.length) {
    lines.push(text.slice(index, index + capacity));
    index += capacity;
    capacity = continuationLineCapacity;
  }

  return lines;
}

export function splitInputDisplayLines(
  display: string,
  prefixLength: number,
  width: number,
): string[] {
  const terminalWidth = Math.max(1, width);
  const lineCapacity = Math.max(1, terminalWidth - prefixLength);
  const logicalLines = display.split("\n");
  const result: string[] = [];

  for (const logicalLine of logicalLines) {
    if (logicalLine.length === 0) {
      result.push("");
      continue;
    }

    const wrapped = wrapTextSegment(logicalLine, lineCapacity, lineCapacity);
    result.push(...wrapped);
  }

  return result.length > 0 ? result : [""];
}

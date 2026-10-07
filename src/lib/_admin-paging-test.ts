/** Paging maths for the admin article list. */
import { pageInfo } from "./admin";

let passed = 0;
let failed = 0;
function eq(a: unknown, b: unknown, name: string) {
  const x = JSON.stringify(a), y = JSON.stringify(b);
  if (x === y) passed++;
  else { failed++; console.error(`✗ ${name}\n    got:      ${x}\n    expected: ${y}`); }
}

eq(pageInfo(212, undefined, 25), { page: 1, pages: 9, offset: 0 }, "no page in the URL = first page");
eq(pageInfo(212, "3", 25), { page: 3, pages: 9, offset: 50 }, "page 3 starts at 50");
eq(pageInfo(212, "9", 25), { page: 9, pages: 9, offset: 200 }, "last page holds the rest");
eq(pageInfo(212, "40", 25), { page: 9, pages: 9, offset: 200 }, "past the end lands on the last page");
eq(pageInfo(212, "0", 25), { page: 1, pages: 9, offset: 0 }, "zero lands on the first");
eq(pageInfo(212, "abc", 25), { page: 1, pages: 9, offset: 0 }, "garbage lands on the first");
eq(pageInfo(0, "2", 25), { page: 1, pages: 1, offset: 0 }, "no articles = one empty page");
eq(pageInfo(25, "2", 25), { page: 1, pages: 1, offset: 0 }, "exactly one full page");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

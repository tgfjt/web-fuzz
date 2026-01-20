export { noServerError } from "./noServerError.ts";
export { formFuzzing } from "./formFuzzing.ts";
export { queryParamFuzzing } from "./queryParamFuzzing.ts";
export { historyNavigation } from "./historyNavigation.ts";
export { rapidClick } from "./rapidClick.ts";
export { reloadStateRestore } from "./reloadStateRestore.ts";

import type { CheckFunction } from "../types.ts";
import { noServerError } from "./noServerError.ts";
import { formFuzzing } from "./formFuzzing.ts";
import { queryParamFuzzing } from "./queryParamFuzzing.ts";
import { historyNavigation } from "./historyNavigation.ts";
import { rapidClick } from "./rapidClick.ts";
import { reloadStateRestore } from "./reloadStateRestore.ts";

export const checks: Record<string, CheckFunction> = {
  noServerError,
  formFuzzing,
  queryParamFuzzing,
  historyNavigation,
  rapidClick,
  reloadStateRestore,
};

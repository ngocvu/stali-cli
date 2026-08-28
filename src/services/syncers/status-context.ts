import type { StaliResolvedUrls } from "../../utils/stali-urls";

export interface DoctorStatusContext {
  urls?: StaliResolvedUrls;
  /** Bỏ đọc cache (vẫn ghi cache sau scan). */
  bypassCache?: boolean;
}

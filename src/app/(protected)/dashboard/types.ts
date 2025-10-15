export type ReleaseSlotState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "warning"; message: string }
  | { status: "error"; message: string };

export const releaseSlotInitialState: ReleaseSlotState = { status: "idle" };

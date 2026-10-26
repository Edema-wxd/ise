/*
  Shapes shared by the inquiry form and its Server Action. These live outside
  `actions.ts` because a "use server" module may only export async functions —
  a plain constant exported from one does not survive to the client.
*/

export type InquiryValues = {
  kind: string;
  name: string;
  email: string;
  message: string;
};

export type InquiryState = {
  status: "idle" | "invalid" | "undelivered" | "sent";
  /** Echoed back so a rejected submission does not throw away what someone
   *  typed. Bumping `key` remounts the fields so the values reapply. */
  key: number;
  values: InquiryValues;
  errors: Record<string, string>;
  message: string;
};

export const EMPTY_INQUIRY: InquiryState = {
  status: "idle",
  key: 0,
  values: { kind: "commission", name: "", email: "", message: "" },
  errors: {},
  message: "",
};

import type { SmokingStatus } from "@/domain/types";
import { Field, Select } from "./ui";

export const SMOKING_LABEL: Record<SmokingStatus, string> = {
  never: "Nunca he fumado",
  former: "Fumaba, ya no",
  current: "Fumo (cigarrillo, vapeador o tabaco)",
};

export function SmokingSelect({ defaultValue }: { defaultValue?: SmokingStatus | null }) {
  return (
    <Field label="¿Fumas?" htmlFor="smoking_status">
      <Select id="smoking_status" name="smoking_status" required defaultValue={defaultValue ?? ""}>
        <option value="" disabled>
          Elige…
        </option>
        {(Object.keys(SMOKING_LABEL) as SmokingStatus[]).map((s) => (
          <option key={s} value={s}>
            {SMOKING_LABEL[s]}
          </option>
        ))}
      </Select>
    </Field>
  );
}

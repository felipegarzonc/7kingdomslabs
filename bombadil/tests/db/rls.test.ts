/**
 * Explicit RLS tests (acceptance criterion: a participant cannot read another's data).
 * Runs against a real Postgres with the migrations applied: `npm run test:db`.
 */
import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.RLS_DATABASE_URL;

describe.skipIf(!url)("row level security", () => {
  let db: pg.Client;
  const ids = {
    userA: randomUUID(),
    userB: randomUUID(),
    userAdmin: randomUUID(),
    userInvited: randomUUID(),
    pA: "",
    pB: "",
    pInvited: "",
    docB: "",
  };

  async function as<T>(userId: string | null, email: string | null, fn: () => Promise<T>): Promise<T> {
    await db.query("begin");
    try {
      if (userId) {
        await db.query("set local role authenticated");
        await db.query("select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claim.email', $2, true)", [userId, email ?? ""]);
      } else {
        await db.query("set local role anon");
      }
      const r = await fn();
      await db.query("commit");
      return r;
    } catch (e) {
      await db.query("rollback");
      throw e;
    }
  }
  const q = (sql: string, params: unknown[] = []) => db.query(sql, params);
  const asA = <T>(fn: () => Promise<T>) => as(ids.userA, "a@example.com", fn);
  const asB = <T>(fn: () => Promise<T>) => as(ids.userB, "b@example.com", fn);
  const asAdmin = <T>(fn: () => Promise<T>) => as(ids.userAdmin, "admin@example.com", fn);

  beforeAll(async () => {
    db = new pg.Client({ connectionString: url });
    await db.connect();
    // Superuser setup (what the Supabase dashboard / service role would do).
    await q("insert into auth.users (id, email) values ($1,'a@example.com'),($2,'b@example.com'),($3,'admin@example.com'),($4,'invited@example.com')", [
      ids.userA,
      ids.userB,
      ids.userAdmin,
      ids.userInvited,
    ]);
    await q("insert into public.admins (user_id) values ($1)", [ids.userAdmin]);
    const r = await q(
      "insert into public.participants (email, display_name) values ('a@example.com','A'),('b@example.com','B'),('invited@example.com','I') returning id, email",
    );
    ids.pA = r.rows.find((x) => x.email === "a@example.com").id;
    ids.pB = r.rows.find((x) => x.email === "b@example.com").id;
    ids.pInvited = r.rows.find((x) => x.email === "invited@example.com").id;

    // Participants link themselves and complete onboarding.
    for (const [uid, mail] of [
      [ids.userA, "a@example.com"],
      [ids.userB, "b@example.com"],
      [ids.userInvited, "invited@example.com"],
    ]) {
      await as(uid, mail, () => q("select public.link_participant()"));
    }
    await asA(() => q("select public.complete_onboarding('1982-01-01','male',176,'meta A','v1','hashA','ua')"));
    await asB(() => q("select public.complete_onboarding('1990-01-01','female',165,'meta B','v1','hashB','ua')"));

    // Participant data.
    await asA(() => q("insert into public.measurements (participant_id,type,value,unit,measured_at) values ($1,'weight',88,'kg',now())", [ids.pA]));
    await asB(() => q("insert into public.measurements (participant_id,type,value,unit,measured_at) values ($1,'weight',60,'kg',now())", [ids.pB]));
    await asB(() => q("insert into public.checkins (participant_id,week,free_text) values ($1,1,'secreto de B')", [ids.pB]));
    await asA(() => q("insert into public.checkins (participant_id,week,free_text) values ($1,1,'hola')", [ids.pA]));

    // Admin: documents, results, reports, replies, alerts for both.
    await asAdmin(async () => {
      const d = await q(
        "insert into public.lab_documents (participant_id, storage_path, status) values ($1,$2,'reviewed'),($3,$4,'reviewed') returning id, participant_id",
        [ids.pA, `${ids.pA}/a.pdf`, ids.pB, `${ids.pB}/b.pdf`],
      );
      const docA = d.rows.find((x) => x.participant_id === ids.pA).id;
      ids.docB = d.rows.find((x) => x.participant_id === ids.pB).id;
      await q(
        "insert into public.lab_results (document_id, participant_id, biomarker_code, sampled_on, value_original, unit_original, value_canonical) values ($1,$2,'hdl','2026-01-01',37,'mg/dL',37),($3,$4,'hdl','2026-01-01',60,'mg/dL',60)",
        [docA, ids.pA, ids.docB, ids.pB],
      );
      for (const pid of [ids.pA, ids.pB]) {
        await q("insert into public.reports (participant_id, content, input_snapshot, prompt_version, model, status) values ($1,'{\"v\":\"draft\"}','{}','r1','m','draft')", [pid]);
        await q(
          "insert into public.reports (participant_id, content, input_snapshot, prompt_version, model, status, approved_at) values ($1,'{\"v\":\"approved\"}','{}','r1','m','approved',now())",
          [pid],
        );
        await q("insert into public.alerts (participant_id, rule_id, level, origin, message) values ($1,'x','next_visit','lab','m')", [pid]);
      }
      const checkins = await q("select id, participant_id from public.checkins");
      for (const c of checkins.rows) {
        await q("insert into public.checkin_replies (checkin_id, participant_id, draft, status) values ($1,$2,'borrador','draft')", [c.id, c.participant_id]);
      }
    });
    await q("insert into storage.objects (bucket_id, name) values ('lab-pdfs', $1)", [`${ids.pB}/b.pdf`]);
  });

  afterAll(async () => {
    await db?.end();
  });

  const participantTables = ["participants", "consents", "measurements", "lab_documents", "lab_results", "checkins", "reports", "alerts", "checkin_replies"];

  it.each(participantTables)("participant A cannot read B's rows in %s", async (table) => {
    const col = table === "participants" ? "id" : "participant_id";
    const rows = await asA(() => q(`select * from public.${table} where ${col} = $1`, [ids.pB]));
    expect(rows.rowCount).toBe(0);
  });

  it("participant A reads their own data", async () => {
    const r = await asA(() => q("select count(*)::int as n from public.measurements"));
    expect(r.rows[0].n).toBe(1);
    const p = await asA(() => q("select id, status, pilot_start from public.participants"));
    expect(p.rows).toHaveLength(1);
    expect(p.rows[0].id).toBe(ids.pA);
    expect(p.rows[0].status).toBe("active");
    expect(p.rows[0].pilot_start).not.toBeNull();
  });

  it("consent is recorded with version and hash", async () => {
    const r = await asA(() => q("select version, text_hash, accepted_at from public.consents"));
    expect(r.rows).toEqual([expect.objectContaining({ version: "v1", text_hash: "hashA" })]);
  });

  it("A cannot insert data for B", async () => {
    await expect(asA(() => q("insert into public.measurements (participant_id,type,value,unit,measured_at) values ($1,'weight',1,'kg',now())", [ids.pB]))).rejects.toThrow(
      /row-level security/,
    );
    await expect(asA(() => q("insert into public.checkins (participant_id,week) values ($1,2)", [ids.pB]))).rejects.toThrow(/row-level security/);
  });

  it("A cannot modify or delete B's rows", async () => {
    const u = await asA(() => q("update public.measurements set value = 1 where participant_id = $1", [ids.pB]));
    const d = await asA(() => q("delete from public.measurements where participant_id = $1", [ids.pB]));
    expect(u.rowCount).toBe(0);
    expect(d.rowCount).toBe(0);
    const still = await asB(() => q("select value from public.measurements"));
    expect(Number(still.rows[0].value)).toBe(60);
  });

  it("participants cannot write lab results or change document status", async () => {
    await expect(
      asA(() =>
        q("insert into public.lab_results (document_id, participant_id, biomarker_code, sampled_on, value_original, unit_original, value_canonical) values ($1,$2,'hdl','2026-01-01',90,'mg/dL',90)", [
          ids.docB,
          ids.pA,
        ]),
      ),
    ).rejects.toThrow(/row-level security/);
    const u = await asA(() => q("update public.lab_documents set status = 'reviewed'"));
    expect(u.rowCount).toBe(0);
  });

  it("participants cannot upload a document already marked as reviewed", async () => {
    await expect(
      asA(() => q("insert into public.lab_documents (participant_id, storage_path, status) values ($1, $2, 'reviewed')", [ids.pA, `${ids.pA}/x.pdf`])),
    ).rejects.toThrow(/row-level security/);
  });

  it("participants only see approved reports", async () => {
    const r = await asA(() => q("select status from public.reports"));
    expect(r.rows.map((x) => x.status)).toEqual(["approved"]);
  });

  it("participants do not see unsent check-in replies", async () => {
    const r = await asA(() => q("select * from public.checkin_replies"));
    expect(r.rowCount).toBe(0);
    await asAdmin(() => q("update public.checkin_replies set status='sent', final_text='ok', sent_at=now() where participant_id=$1", [ids.pA]));
    const r2 = await asA(() => q("select final_text from public.checkin_replies"));
    expect(r2.rows).toEqual([{ final_text: "ok" }]);
  });

  it("participants cannot promote themselves or edit protected fields", async () => {
    await expect(asA(() => q("insert into public.admins (user_id) values ($1)", [ids.userA]))).rejects.toThrow(/row-level security/);
    const u = await asA(() => q("update public.participants set status='completed', priorities='{hack}'"));
    expect(u.rowCount).toBe(0);
    const isAdmin = await asA(() => q("select public.is_admin() as x"));
    expect(isAdmin.rows[0].x).toBe(false);
  });

  it("participants cannot resolve alerts or raise them for others", async () => {
    const u = await asA(() => q("update public.alerts set status='resolved'"));
    expect(u.rowCount).toBe(0);
    await expect(asA(() => q("insert into public.alerts (participant_id, rule_id, level, origin, message) values ($1,'x','urgency','checkin','m')", [ids.pB]))).rejects.toThrow(
      /row-level security/,
    );
  });

  it("invited (not onboarded) participants cannot record data", async () => {
    await expect(
      as(ids.userInvited, "invited@example.com", () =>
        q("insert into public.measurements (participant_id,type,value,unit,measured_at) values ($1,'weight',70,'kg',now())", [ids.pInvited]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("link_participant only links the matching email", async () => {
    const stranger = randomUUID();
    await q("insert into auth.users (id, email) values ($1, 'stranger@example.com')", [stranger]);
    const r = await as(stranger, "stranger@example.com", () => q("select public.link_participant() as id"));
    expect(r.rows[0].id).toBeNull();
    const seen = await as(stranger, "stranger@example.com", () => q("select count(*)::int as n from public.participants"));
    expect(seen.rows[0].n).toBe(0);
  });

  it("anonymous users cannot read anything", async () => {
    await expect(as(null, null, () => q("select * from public.participants"))).rejects.toThrow(/permission denied/);
    await expect(as(null, null, () => q("select * from public.measurements"))).rejects.toThrow(/permission denied/);
  });

  it("admin sees all participants' data", async () => {
    const r = await asAdmin(() => q("select count(distinct participant_id)::int as n from public.measurements"));
    expect(r.rows[0].n).toBe(2);
    const reports = await asAdmin(() => q("select count(*)::int as n from public.reports"));
    expect(reports.rows[0].n).toBe(4);
  });

  it("audit log: admins append as themselves, participants cannot read it, nobody edits it", async () => {
    await asAdmin(() => q("insert into public.audit_log (actor_user_id, action, participant_id) values ($1, 'view_participant', $2)", [ids.userAdmin, ids.pA]));
    await expect(asAdmin(() => q("insert into public.audit_log (actor_user_id, action) values ($1, 'forged')", [ids.userA]))).rejects.toThrow(/row-level security/);
    await expect(asA(() => q("insert into public.audit_log (actor_user_id, action) values ($1, 'x')", [ids.userA]))).rejects.toThrow(/row-level security/);
    const seenByA = await asA(() => q("select * from public.audit_log"));
    expect(seenByA.rowCount).toBe(0);
    const upd = await asAdmin(() => q("update public.audit_log set action = 'changed'"));
    const del = await asAdmin(() => q("delete from public.audit_log"));
    expect(upd.rowCount).toBe(0);
    expect(del.rowCount).toBe(0);
  });

  it("storage: participants upload only into their own folder and cannot read others' PDFs", async () => {
    await asA(() => q("insert into storage.objects (bucket_id, name) values ('lab-pdfs', $1)", [`${ids.pA}/mine.pdf`]));
    await expect(asA(() => q("insert into storage.objects (bucket_id, name) values ('lab-pdfs', $1)", [`${ids.pB}/evil.pdf`]))).rejects.toThrow(/row-level security/);
    const r = await asA(() => q("select name from storage.objects"));
    expect(r.rows.map((x) => x.name)).toEqual([`${ids.pA}/mine.pdf`]);
    const admin = await asAdmin(() => q("select count(*)::int as n from storage.objects"));
    expect(admin.rows[0].n).toBe(2);
  });

  it("deleting a participant cascades to all their data", async () => {
    await q("delete from public.participants where id = $1", [ids.pB]);
    for (const t of ["consents", "measurements", "lab_documents", "lab_results", "checkins", "checkin_replies", "reports", "alerts"]) {
      const r = await q(`select count(*)::int as n from public.${t} where participant_id = $1`, [ids.pB]);
      expect(r.rows[0].n, t).toBe(0);
    }
  });
});

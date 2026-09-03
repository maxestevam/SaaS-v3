export type CronActor = {
  isCron?: boolean;
  taskUid?: string | null;
};

/** Identifica chamadas autenticadas pelo agendador gerenciado da plataforma. */
export function isAuthorizedCron(actor: CronActor | null | undefined): actor is Required<CronActor> {
  return Boolean(actor?.isCron && typeof actor.taskUid === "string" && actor.taskUid.length > 0);
}

import { createApi } from "../../server/api.mjs";
import { createNetlifyStore } from "../../server/store.mjs";

export default async (request, context) =>
  createApi({ store: createNetlifyStore() })(request, { ip: context.ip });

export default async function getOrgBranding(request) {
  if (!request.user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'unauthorized');
  }

  const { tenantId } = request.params;

  if (!tenantId) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Missing tenantId.');
  }

  try {
    const tenantPointer = Parse.Object.fromJSON({
      __type: 'Pointer',
      className: 'partners_Tenant',
      objectId: tenantId,
    });

    const query = new Parse.Query('contracts_OrgBranding');
    query.equalTo('TenantId', tenantPointer);
    const record = await query.first({ useMasterKey: true });

    if (!record) {
      return { logoLight: null, logoDark: null };
    }

    const logoLightFile = record.get('logoLight');
    const logoDarkFile = record.get('logoDark');

    return {
      logoLight: logoLightFile ? logoLightFile.url() : null,
      logoDark: logoDarkFile ? logoDarkFile.url() : null,
    };
  } catch (err) {
    const code = err.code || 400;
    const msg = err.message || 'Something went wrong.';
    throw new Parse.Error(code, msg);
  }
}

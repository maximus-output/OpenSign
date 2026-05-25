export default async function saveOrgBranding(request) {
  if (!request.user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'unauthorized');
  }

  const { tenantId, logoLight, logoDark } = request.params;

  if (!tenantId) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Missing tenantId.');
  }

  try {
    const tenantPointer = Parse.Object.fromJSON({
      __type: 'Pointer',
      className: 'partners_Tenant',
      objectId: tenantId,
    });

    // Find existing OrgBranding record for this tenant
    const query = new Parse.Query('contracts_OrgBranding');
    query.equalTo('TenantId', tenantPointer);
    let record = await query.first({ useMasterKey: true });

    if (!record) {
      record = new Parse.Object('contracts_OrgBranding');
      record.set('TenantId', tenantPointer);
    }

    // Handle logoLight
    if ('logoLight' in request.params) {
      if (logoLight === null) {
        record.unset('logoLight');
      } else {
        const { base64, contentType, name } = logoLight;
        const file = new Parse.File(name, { base64 }, contentType);
        await file.save({ useMasterKey: true });
        record.set('logoLight', file);
      }
    }

    // Handle logoDark
    if ('logoDark' in request.params) {
      if (logoDark === null) {
        record.unset('logoDark');
      } else {
        const { base64, contentType, name } = logoDark;
        const file = new Parse.File(name, { base64 }, contentType);
        await file.save({ useMasterKey: true });
        record.set('logoDark', file);
      }
    }

    const saved = await record.save(null, { useMasterKey: true });
    return JSON.parse(JSON.stringify(saved));
  } catch (err) {
    const code = err.code || 400;
    const msg = err.message || 'Something went wrong.';
    throw new Parse.Error(code, msg);
  }
}

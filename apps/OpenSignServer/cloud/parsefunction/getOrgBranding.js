import { getSignedLocalUrl } from './getSignedUrl.js';

function signLogoUrl(url) {
  if (!url) return null;
  return url.includes('/files/') ? getSignedLocalUrl(url, 86400) : url;
}

export default async function getOrgBranding(request) {
  if (!request.user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'unauthorized');
  }

  const { tenantId } = request.params;

  if (!tenantId) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Missing tenantId.');
  }

  // Verify caller belongs to this tenant (no role requirement for reads)
  const userQuery = new Parse.Query('contracts_Users');
  userQuery.equalTo('UserId', request.user);
  const extUser = await userQuery.first({ useMasterKey: true });
  if (!extUser || extUser.get('TenantId')?.id !== tenantId) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'unauthorized');
  }

  try {
    const tenantPointer = { __type: 'Pointer', className: 'partners_Tenant', objectId: tenantId };

    const query = new Parse.Query('contracts_OrgBranding');
    query.equalTo('TenantId', tenantPointer);
    const record = await query.first({ useMasterKey: true });

    if (!record) {
      return { logoLight: null, logoDark: null };
    }

    const logoLightFile = record.get('logoLight');
    const logoDarkFile = record.get('logoDark');

    return {
      logoLight: signLogoUrl(logoLightFile?.url()),
      logoDark: signLogoUrl(logoDarkFile?.url()),
    };
  } catch (err) {
    console.error('err in getorgbranding', err);
    const code = err.code || 400;
    const msg = err.message || 'Something went wrong.';
    throw new Parse.Error(code, msg);
  }
}

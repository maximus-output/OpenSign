import { appName } from '../../Utils.js';

// `GetLogoByDomain` is used to get logo by domain as well as check any tenant exist or not in db
export default async function GetLogoByDomain(request) {
  const domain = request.params.domain;
  try {
    const tenantCreditsQuery = new Parse.Query('partners_Tenant');
    tenantCreditsQuery.equalTo('Domain', domain);
    const res = await tenantCreditsQuery.first({ useMasterKey: true });
    if (res) {
      const updateRes = JSON.parse(JSON.stringify(res));
      let logoLight = null;
      let logoDark = null;
      try {
        const brandingQuery = new Parse.Query('contracts_OrgBranding');
        brandingQuery.equalTo('TenantId', {
          __type: 'Pointer',
          className: 'partners_Tenant',
          objectId: res.id,
        });
        const branding = await brandingQuery.first({ useMasterKey: true });
        logoLight = branding?.get('logoLight')?.url() ?? null;
        logoDark = branding?.get('logoDark')?.url() ?? null;
      } catch (_) {
        // branding query failed — fall back to nulls
      }
      return {
        logo: updateRes?.Logo,
        favicon: updateRes?.Favicon || updateRes?.Logo,
        appname: appName,
        user: 'exist',
        logoLight,
        logoDark,
      };
    } else {
      const tenantCreditsQuery = new Parse.Query('partners_Tenant');
      const tenantRes = await tenantCreditsQuery.first({ useMasterKey: true });
      if (tenantRes) {
        let logoLight = null;
        let logoDark = null;
        try {
          const brandingQuery = new Parse.Query('contracts_OrgBranding');
          brandingQuery.equalTo('TenantId', {
            __type: 'Pointer',
            className: 'partners_Tenant',
            objectId: tenantRes.id,
          });
          const branding = await brandingQuery.first({ useMasterKey: true });
          logoLight = branding?.get('logoLight')?.url() ?? null;
          logoDark = branding?.get('logoDark')?.url() ?? null;
        } catch (_) {
          // branding query failed — fall back to nulls
        }
        return { logo: '', appname: appName, user: 'exist', logoLight, logoDark };
      } else {
        return { logo: '', appname: appName, user: 'not_exist', logoLight: null, logoDark: null };
      }
    }
  } catch (err) {
    const code = err.code || 400;
    const msg = err.message || 'Something went wrong.';
    throw new Parse.Error(code, msg);
  }
}

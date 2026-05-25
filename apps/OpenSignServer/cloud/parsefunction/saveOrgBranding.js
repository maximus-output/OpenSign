const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml', 'image/webp'];
const ALLOWED_EXT = /\.(png|jpe?g|gif|svg|webp)$/i;

function validateLogoField(logo, fieldName) {
  if (!logo.base64 || !logo.contentType || !logo.name) {
    throw new Parse.Error(400, `Invalid ${fieldName}: base64, contentType, and name are required`);
  }
  if (!ALLOWED_TYPES.includes(logo.contentType) || !ALLOWED_EXT.test(logo.name)) {
    throw new Parse.Error(400, 'Invalid file type');
  }
}

export default async function saveOrgBranding(request) {
  if (!request.user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'unauthorized');
  }

  const { tenantId, logoLight, logoDark } = request.params;

  if (!tenantId) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Missing tenantId.');
  }

  // Verify caller belongs to this tenant and has admin role
  const userQuery = new Parse.Query('contracts_Users');
  userQuery.equalTo('UserId', request.user);
  const extUser = await userQuery.first({ useMasterKey: true });
  if (!extUser || extUser.get('TenantId')?.id !== tenantId) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'unauthorized');
  }
  const role = extUser.get('UserRole');
  if (role !== 'contracts_Admin' && role !== 'contracts_OrgAdmin') {
    throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'admin role required');
  }

  try {
    const tenantPointer = { __type: 'Pointer', className: 'partners_Tenant', objectId: tenantId };

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
        validateLogoField(logoLight, 'logoLight');
        const { base64, contentType, name } = logoLight;
        const file = new Parse.File(name, { base64 }, contentType);
        record.set('logoLight', file);
      }
    }

    // Handle logoDark
    if ('logoDark' in request.params) {
      if (logoDark === null) {
        record.unset('logoDark');
      } else {
        validateLogoField(logoDark, 'logoDark');
        const { base64, contentType, name } = logoDark;
        const file = new Parse.File(name, { base64 }, contentType);
        record.set('logoDark', file);
      }
    }

    const tenantBranding = await record.save(null, { useMasterKey: true });
    return {
      logoLight: tenantBranding.get('logoLight')?.url() ?? null,
      logoDark: tenantBranding.get('logoDark')?.url() ?? null,
    };
  } catch (err) {
    console.error('err in saveorgbranding', err);
    throw new Parse.Error(err.code || 400, err.message || 'Something went wrong.');
  }
}

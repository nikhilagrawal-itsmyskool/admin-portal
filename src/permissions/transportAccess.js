// Route-scoped access for bus attendance (UI-only, see permissions.md).
//
// A `transport-attendance` teacher may only act on routes where they are one of
// the route's staff — the accompanying teacher, helper or route incharge. These
// ids come straight from the route list/get response (transport_route columns).
// Managers (transport.view: god / admin / transport-incharge) see every route.

export function routeStaffIds(route) {
  return [route?.accompanyingTeacherId, route?.helperId, route?.routeInchargeId].filter(Boolean);
}

// Filter a routes array to the ones the user may take attendance for.
//   canViewAll — pass can('transport.view'); true means "manager, see all".
export function visibleTransportRoutes(routes, { user, canViewAll }) {
  if (canViewAll) return routes || [];
  const empId = user?.employeeId;
  if (!empId) return [];
  return (routes || []).filter((r) => routeStaffIds(r).includes(empId));
}

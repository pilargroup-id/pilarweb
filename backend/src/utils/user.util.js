function jobLevelValue(user) {
  const value = Number(user?.job_level_value);
  return Number.isFinite(value) ? value : null;
}

function primaryDepartment(user) {
  if (user?.department_id !== undefined && user?.department_id !== null) {
    return {
      id: Number(user.department_id),
      name: user.department || null,
      code: user.department_code || null,
      class: user.department_class || null,
    };
  }

  const departments = Array.isArray(user?.departments) ? user.departments : [];
  const department = departments.find((row) => Number(row?.is_primary) === 1) || departments[0];
  if (!department) return null;

  return {
    id: Number(department.department_id ?? department.id),
    name: department.department_name ?? department.name ?? null,
    code: department.department_code ?? department.code ?? null,
    class: department.department_class ?? department.class ?? null,
  };
}

function primaryCompany(user) {
  if (user?.company_id) {
    return {
      id: String(user.company_id),
      name: user.company || null,
    };
  }

  const companies = Array.isArray(user?.companies) ? user.companies : [];
  const company = companies.find((row) => Number(row?.is_primary) === 1) || companies[0];
  if (!company) return null;

  return {
    id: String(company.id),
    name: company.name || null,
  };
}

function snapshot(user) {
  const department = primaryDepartment(user);
  const company = primaryCompany(user);

  return {
    user_id: user?.id ? String(user.id) : null,
    internal_id: user?.internal_id ?? null,
    name: user?.name || user?.username || null,
    job_level_value: jobLevelValue(user),
    job_level_name: user?.job_level || null,
    department_id: department?.id ?? null,
    department_name: department?.name ?? null,
    company_id: company?.id ?? null,
    company_name: company?.name ?? null,
  };
}

module.exports = {
  jobLevelValue,
  primaryDepartment,
  primaryCompany,
  snapshot,
};

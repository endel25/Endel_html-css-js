window.hasPermission = function (moduleName, action = 'canRead') {
    const permissions = JSON.parse(localStorage.getItem('permissions') || '[]');
    const perm = permissions.find(p => p.name === moduleName);
    return perm ? perm[action] : false;
};

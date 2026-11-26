// The brand rule: partner workspaces and the /partner path see Lumen; everyone else sees Harbor.
(function (root) {
  const BRANDS = {
    harbor: { name: 'Harbor', logo: '/brands/harbor/logo.svg', mark: '/brands/harbor/mark.svg', theme: '/brands/harbor/theme.css' },
    lumen: { name: 'Lumen', logo: '/brands/lumen/logo.svg', mark: '/brands/lumen/mark.svg', theme: '/brands/lumen/theme.css' },
  };

  function brandFor(workspace, pathname) {
    return (workspace && workspace.partner) || /^\/partner(?:\/|$)/.test(pathname) ? 'lumen' : 'harbor';
  }

  // The side rail shows Lumen's collapsed mark at 25 px with a 10 px inset; Harbor shows its full logo at 32 px.
  function railLogo(brandId) {
    const b = BRANDS[brandId];
    return brandId === 'lumen' ? { src: b.mark, height: 25, inset: 10 } : { src: b.logo, height: 32, inset: 0 };
  }

  const api = { BRANDS, brandFor, railLogo };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DeskBrand = api;
})(this);

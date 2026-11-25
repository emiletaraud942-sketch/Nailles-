// Exécuté avant l'affichage.
// - « js » : les animations d'apparition ne cachent rien si le script ne se charge pas.
// - « wants-3d » : le navigateur peut afficher la scène 3D (WebGL, mouvement autorisé, pas d'économie de données).
(function () {
  var html = document.documentElement;
  html.classList.add('js');
  try {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var save = navigator.connection && navigator.connection.saveData;
    var canvas = document.createElement('canvas');
    var gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!reduce && !save && gl) html.classList.add('wants-3d');
    var ext = gl && gl.getExtension('WEBGL_lose_context');
    if (ext) ext.loseContext();
  } catch (e) {
    /* pas de 3D */
  }
})();

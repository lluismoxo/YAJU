/* Sustituto local de MktoForms2: pinta los formularios desde /assets/forms/<id>.html y ofrece la parte
   de la API que usa la web (loadForm, getFormElem, vals, onSubmit, submittable, onSuccess, submit, validate).
   El envio real lo hace el callback de la web (funciones de Supabase); aqui no se envia nada a terceros. */
(function () {
  if (window.MktoForms2) return;
  var BASE = "/assets/forms/";
  var todos = [];

  function estilos() {
    [["mktoForms2BaseStyle", "forms2.css"], ["mktoForms2ThemeStyle", "forms2-theme-simple.css"]].forEach(function (x) {
      if (document.getElementById(x[0])) return;
      var l = document.createElement("link");
      l.id = x[0]; l.rel = "stylesheet"; l.type = "text/css"; l.href = BASE + x[1];
      document.head.appendChild(l);
    });
  }

  function campos(el) { return Array.prototype.slice.call(el.querySelectorAll(".mktoField[name]")); }
  function porNombre(el, n) { return campos(el).filter(function (c) { return c.name === n; }); }
  function oculto(n) { return !n || n.offsetParent === null && getComputedStyle(n).position !== "fixed"; }
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function Formulario(el, id) {
    this.el = el; this.id = id; this.envios = []; this.exitos = []; this.enviable = true;
    var yo = this;
    el.setAttribute("novalidate", "novalidate");
    el.addEventListener("submit", function (e) { e.preventDefault(); yo.submit(); });
    var revisar = function (e) {
      var w = e.target && e.target.closest && e.target.closest(".mktoFieldWrap");
      if (w && w.querySelector(".mktoError")) yo._validarWrap(w);
    };
    el.addEventListener("input", revisar);
    el.addEventListener("change", revisar);
  }
  Formulario.prototype.getId = function () { return this.id; };
  Formulario.prototype.getFormElem = function () { var a = [this.el]; a.get = function (i) { return a[i]; }; return a; };
  Formulario.prototype.submittable = function (v) { if (arguments.length) { this.enviable = !!v; return this; } return this.enviable; };
  Formulario.prototype.onSubmit = function (f) { this.envios.push(f); return this; };
  Formulario.prototype.onSuccess = function (f) { this.exitos.push(f); return this; };
  Formulario.prototype.onValidate = function () { return this; };
  Formulario.prototype.whenReady = function (f) { f(this); return this; };
  Formulario.prototype.vals = function (o) {
    var el = this.el;
    if (o && typeof o === "object") {
      Object.keys(o).forEach(function (n) {
        var v = o[n], cs = porNombre(el, n);
        cs.forEach(function (c) {
          if (c.type === "checkbox" || c.type === "radio") {
            c.checked = cs.length === 1 && c.type === "checkbox" ? (v === true || v === "yes" || v === "true" || v === c.value) : String(v) === c.value;
          } else c.value = v == null ? "" : String(v);
        });
      });
      return this;
    }
    var r = {};
    campos(el).forEach(function (c) {
      var n = c.name;
      if (c.type === "checkbox") {
        var g = porNombre(el, n);
        if (g.length === 1) r[n] = c.checked ? "yes" : "no";
        else { if (!r[n]) r[n] = []; if (c.checked) r[n].push(c.value); }
      } else if (c.type === "radio") { if (c.checked) r[n] = c.value; else if (!(n in r)) r[n] = ""; }
      else r[n] = c.value;
    });
    return r;
  };

  Formulario.prototype._error = function (w, msg, detalle) {
    var ya = w.querySelector(".mktoError"); if (ya) ya.remove();
    var cs = Array.prototype.slice.call(w.querySelectorAll(".mktoField"));
    cs.forEach(function (c) { c.classList.add("mktoInvalid"); c.setAttribute("aria-invalid", "true"); });
    var d = document.createElement("div"); d.className = "mktoError";
    d.innerHTML = '<div class="mktoErrorArrowWrap"><div class="mktoErrorArrow"></div></div><div role="alert" tabindex="-1" class="mktoErrorMsg"></div>';
    var m = d.querySelector(".mktoErrorMsg"); m.textContent = msg;
    if (detalle) { var s = document.createElement("span"); s.className = "mktoErrorDetail"; s.textContent = detalle; m.appendChild(document.createTextNode(" ")); m.appendChild(s); }
    var ult = cs[cs.length - 1], ancla = ult && ult.closest(".mktoCheckboxList,.mktoRadioList") || ult;
    if (ancla && ancla.parentNode === w) w.insertBefore(d, ancla.nextSibling); else w.appendChild(d);
    return cs[0];
  };
  Formulario.prototype._limpiar = function (w) {
    var ya = w.querySelector(".mktoError"); if (ya) ya.remove();
    Array.prototype.forEach.call(w.querySelectorAll(".mktoField"), function (c) { c.classList.remove("mktoInvalid"); c.removeAttribute("aria-invalid"); });
  };
  Formulario.prototype._validarWrap = function (w) {
    this._limpiar(w);
    if (oculto(w)) return null;
    var cs = Array.prototype.slice.call(w.querySelectorAll(".mktoField[name]"));
    if (!cs.length) return null;
    var req = w.classList.contains("mktoRequiredField") || cs.some(function (c) { return c.classList.contains("mktoRequired") || c.getAttribute("aria-required") === "true"; });
    var t = cs[0].type, vacio;
    if (t === "checkbox" || t === "radio") vacio = !cs.some(function (c) { return c.checked; });
    else vacio = !String(cs[0].value || "").trim() && !(cs[0].validity && cs[0].validity.badInput);
    if (t === "number" && cs[0].validity && cs[0].validity.badInput) return this._error(w, "Must be a number.");
    if (req && vacio) return this._error(w, t === "checkbox" && cs.length > 1 ? "Please select at least one option." : "This field is required.");
    if (!vacio && (t === "email" || cs[0].classList.contains("mktoEmailField")) && !EMAIL.test(cs[0].value.trim()))
      return this._error(w, "Must be valid email.", "example@yourdomain.com");
    return null;
  };
  Formulario.prototype.validate = function () {
    var yo = this, primero = null;
    Array.prototype.forEach.call(this.el.querySelectorAll(".mktoFieldWrap"), function (w) {
      var c = yo._validarWrap(w); if (c && !primero) primero = c;
    });
    if (primero) { try { primero.focus(); } catch (e) {} return false; }
    return true;
  };
  Formulario.prototype.submit = function () {
    if (!this.validate()) return this;
    this.enviable = true;
    for (var i = 0; i < this.envios.length; i++) { try { this.envios[i](this); } catch (e) {} }
    if (!this.enviable) return this;
    var v = this.vals();
    for (var j = 0; j < this.exitos.length; j++) { try { this.exitos[j](v, location.href); } catch (e) {} }
    return this;
  };

  var cache = {};
  function plantilla(id) {
    if (!cache[id]) cache[id] = fetch(BASE + id + ".html", { credentials: "same-origin" }).then(function (r) {
      if (!r.ok) throw new Error("form " + id + " " + r.status); return r.text();
    });
    return cache[id];
  }

  window.MktoForms2 = {
    loadForm: function (base, munchkin, id, cb) {
      estilos();
      var el = document.getElementById("mktoForm_" + id);
      plantilla(id).then(function (html) {
        el = el && el.isConnected ? el : document.getElementById("mktoForm_" + id);
        if (!el) return;
        var t = document.createElement("template"); t.innerHTML = html.trim();
        var src = t.content.querySelector("form");
        if (!src) return;
        el.className = src.className; el.innerHTML = src.innerHTML;
        var f = new Formulario(el, id); todos.push(f);
        if (typeof cb === "function") cb(f);
      }).catch(function (e) { console.warn("[forms]", e && e.message); });
    },
    allForms: function () { return todos.slice(); },
    getForm: function (id) { for (var i = 0; i < todos.length; i++) if (String(todos[i].id) === String(id)) return todos[i]; return null; },
    whenReady: function (f) { todos.forEach(f); },
    whenRendered: function (f) { todos.forEach(f); }
  };
})();

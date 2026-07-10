// =========================================================================
// 1. CONFIGURACIÓN Y CONEXIÓN CON SUPABASE (ENTORNO SEGURO DATOS REALES)
// =========================================================================
const ADMIN_PASSWORD = "Maderas_Habitarq_2026";
const SUPABASE_URL = "https://supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_lnwuBk9887iZy76uvAxeIQ_8StvDZ8K";

// Mini-librería con aislamiento nativo estable contra errores CORS
(function(global) {
    function SupabaseClient(urlProyecto, keyProyecto) {
        this.url = urlProyecto;
        this.key = keyProyecto;
        this.storage = {
            from: function(b) {
                var urlStorage = urlProyecto;
                var keyStorage = keyProyecto;
                return {
                    upload: function(path, files) {
                        return fetch(urlStorage + '/storage/v1/object/' + b + '/' + path, {
                            method: 'POST',
                            headers: { 'apikey': keyStorage, 'Authorization': 'Bearer ' + keyStorage },
                            body: files
                        }).then(function(r) { return r.json().then(function(d) { return r.ok ? { data: d, error: null } : { data: null, error: d }; }); });
                    },
                    getPublicUrl: function(path) { return { data: { publicUrl: urlStorage + '/storage/v1/object/public/' + b + '/' + path } }; }
                };
            }
        };
        this.from = function(t) {
            var filters = [];
            var ctx = {
                select: function(cols) { return ctx; },
                eq: function(col, val) { filters.push(col + '=eq.' + encodeURIComponent(val)); return ctx; },
                maybeSingle: function() {
                    var query = filters.length ? '?' + filters.join('&') : '';
                    return fetch(urlProyecto + '/rest/v1/' + t + query, { headers: { 'apikey': keyProyecto, 'Authorization': 'Bearer ' + keyProyecto, 'Accept': 'application/json' } })
                    .then(function(r) { return r.json().then(function(d) { if (!r.ok) return { data: null, error: d }; var dataObj = (Array.isArray(d) && d.length > 0) ? d : (Array.isArray(d) ? null : d); return { data: dataObj, error: null }; }); });
                },
                update: function(obj) {
                    var query = filters.length ? '?' + filters.join('&') : '';
                    return fetch(urlProyecto + '/rest/v1/' + t + query, { method: 'PATCH', headers: { 'apikey': keyProyecto, 'Authorization': 'Bearer ' + keyProyecto, 'Content-Type': 'application/json' }, body: JSON.stringify(obj) })
                    .then(function(r) { return r.ok ? { error: null } : r.json().then(function(e) { return { error: e }; }); });
                },
                insert: function(arr) {
                    return fetch(urlProyecto + '/rest/v1/' + t, { method: 'POST', headers: { 'apikey': keyProyecto, 'Authorization': 'Bearer ' + keyProyecto, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }, body: JSON.stringify(arr) })
                    .then(function(r) { return r.json().then(function(d) { return r.ok ? { data: d, error: null } : { data: null, error: d }; }); });
                },
                delete: function() {
                    var query = filters.length ? '?' + filters.join('&') : '';
                    return fetch(urlProyecto + '/rest/v1/' + t + query, { method: 'DELETE', headers: { 'apikey': keyProyecto, 'Authorization': 'Bearer ' + keyProyecto } })
                    .then(function(r) { return r.ok ? { error: null } : r.json().then(function(e) { return { error: e }; }); });
                }
            };
            return ctx;
        };
    }
    global.supabase = { createClient: function(u, k) { return new SupabaseClient(u, k); } };
})(window);

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variables globales de control de estado
let seccionActiva = null;
let puestoActivo = null;
let idProductoEdicion = null; 
let esNuevaInsercionAcumulativa = false;
let modoBorradoDeExtrasActivado = false;

// =========================================================================
// 2. CONTROL DE ACCESO (LOGIN)
// =========================================================================
function entrarAdmin() {
    const password = document.getElementById('adminPassword').value;
    const loginBox = document.getElementById('loginBox');
    const adminPanel = document.getElementById('adminPanel');
    const statusMessage = document.getElementById('statusMessage');
    const mainPublico = document.getElementById('mainPublico');

    if (password === ADMIN_PASSWORD) {
        loginBox.hidden = true;
        adminPanel.hidden = false;
        statusMessage.textContent = "Acceso concedido al panel de administración.";
        mainPublico.hidden = false;
        descargarYRenderizarImagenes();
        cargarCuadriculaVideosAdmin();
        listarModularesAdmin(); 
    } else {
        statusMessage.textContent = "Contraseña incorrecta.";
        alert("Contraseña incorrecta. Por favor, vuelve a intentarlo.");
    }
}

// =========================================================================
// 3. CAPTURA EL CLIC DIRECTO DEL CATÁLOGO FIJO (S1-S12)
// =========================================================================
function seleccionarPosicion(seccionId, puesto, nombreProducto) {
    seccionActiva = seccionId; 
    puestoActivo = puesto;
    esNuevaInsercionAcumulativa = false;
    modoBorradoDeExtrasActivado = false;
    
    document.querySelectorAll('.item-variante').forEach(function(el) {
        el.style.border = "";
        el.style.background = "";
    });
    
    const btn = document.getElementById('btnSubir'); 
    if (btn) {
        btn.textContent = "Actualizar Imagen Web";
        btn.style.backgroundColor = "#1cbd5d"; 
        btn.style.cursor = "pointer";
        btn.disabled = false;
        btn.onclick = subirImagenPuesto;
    }
    
    const indicador = document.getElementById('indicadorSeleccion');
    if (indicador) {
        indicador.innerHTML = "🎯 Reemplazando casilla tradicional de: <strong>" + nombreProducto + "</strong>";
    }
}

// =========================================================================
// 3B. ACCIÓN DISPARADORA DEL NUEVO BOTÓN DE MÁS (➕)
// =========================================================================
function seleccionarParaAgregarNuevaImagen(seccionId, nombreProducto) {
    seccionActiva = seccionId;
    puestoActivo = "Puesto_Extra_" + Date.now(); 
    esNuevaInsercionAcumulativa = true;
    modoBorradoDeExtrasActivado = false;

    document.querySelectorAll('.item-variante').forEach(function(el) {
        el.style.border = "";
        el.style.background = "";
    });

    if (event && event.currentTarget) {
        event.currentTarget.style.setProperty('border', '2px solid #1cbd5d', 'important');
        event.currentTarget.style.setProperty('background', '#f0fdf4', 'important');
    }

    const indicador = document.getElementById('indicadorSeleccion');
    if (indicador) {
        indicador.innerHTML = "➕ Añadiendo foto nueva a la galería de: <strong>" + nombreProducto + "</strong>";
    }

    const btn = document.getElementById('btnSubir');
    if (btn) {
        btn.textContent = "Actualizar Imagen Web";
        btn.disabled = false;
        btn.style.backgroundColor = "#1cbd5d";
        btn.style.cursor = "pointer";
        btn.onclick = subirImagenPuesto;
    }
}
// =========================================================================
// 3C. ACCIÓN DISPARADORA DEL NUEVO BOTÓN DE MENOS (❌)
// =========================================================================
function seleccionarParaBorrarImagenesExtra(seccionId, nombreProducto) {
    seccionActiva = seccionId;
    puestoActivo = null;
    esNuevaInsercionAcumulativa = false;
    modoBorradoDeExtrasActivado = true;

    document.querySelectorAll('.item-variante').forEach(function(el) {
        el.style.border = "";
        el.style.background = "";
    });

    if (event && event.currentTarget) {
        event.currentTarget.style.setProperty('border', '2px solid #ef4444', 'important');
        event.currentTarget.style.setProperty('background', '#fee2e2', 'important');
    }

    const indicador = document.getElementById('indicadorSeleccion');
    if (indicador) {
        indicador.innerHTML = "🚨 Modo Purga: Listo para vaciar las fotos extras de: <strong>" + nombreProducto + "</strong>";
    }

    const btn = document.getElementById('btnSubir');
    if (btn) {
        btn.disabled = false;
        btn.textContent = "🔥 Confirmar y Eliminar Fotos Extras";
        btn.style.backgroundColor = "#ef4444";
        btn.style.cursor = "pointer";
        
        btn.onclick = async function() {
            if (!confirm("¿Estás seguro de eliminar permanentemente todas las imágenes extras agregadas con el botón ➕ para este producto?")) {
                return;
            }
            try {
                const urlDelete = SUPABASE_URL + '/rest/v1/catalogo_imagenes?seccion_id=eq.' + encodeURIComponent(seccionActiva) + '&orden=like.Puesto_Extra_*';
                const respuesta = await fetch(urlDelete, {
                    method: 'DELETE',
                    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }
                });
                if (!respuesta.ok) throw new Error("La base de datos rechazó la solicitud.");

                alert("¡Éxito! Galería de fotos extras limpiada en el servidor.");
                btn.textContent = "Actualizar Imagen Web";
                btn.style.backgroundColor = "#94a3b8";
                btn.disabled = true;
                btn.onclick = subirImagenPuesto;
                if (indicador) indicador.innerHTML = "Selecciona una posición en el catálogo para empezar.";
                descargarYRenderizarImagenes();
            } catch(err) { alert(err.message); }
        };
    }
}

// =========================================================================
// 4. SUBIDA POR COORDENADAS CON NOMBRE PLANO ACUMULATIVO (INSERCION PURA)
// =========================================================================
async function subirImagenPuesto() {
    const fileInput = document.getElementById('nuevaImagen');
    const txtNombre = document.getElementById('subVarianteNombre');
    
    if (!fileInput || !fileInput.files.length) return alert("Selecciona una imagen antes de continuar.");
    if (!seccionActiva || !puestoActivo) return alert("Por favor, selecciona una posición o el botón ➕.");

    const nombreVariante = txtNombre ? txtNombre.value.trim() : "";
    const file = fileInput.files; 
    const path = "posiciones/sub_variantes/" + Date.now() + "_" + file.name.normalize('NFKD').replace(/[^\w.\-]/g, '_');
    
    try {
        const { error: errUpload } = await supabaseClient.storage.from('catalogos').upload(path, file);
        if (errUpload) throw errUpload;
        
        const { data: urlData } = supabaseClient.storage.from('catalogos').getPublicUrl(path);
        
        if (esNuevaInsercionAcumulativa) {
            await supabaseClient.from('catalogo_imagenes').insert([{
                seccion_id: seccionActiva,
                orden: puestoActivo, 
                ruta_imagen: urlData.publicUrl,
                nombre_sub_variante: nombreVariante
            }]);
            alert("¡Éxito! Nueva imagen añadida correctamente con el nombre: " + nombreVariante);
        } else {
            const urlFetch = SUPABASE_URL + '/rest/v1/catalogo_imagenes?select=id&seccion_id=eq.' + encodeURIComponent(seccionActiva) + '&orden=eq.' + puestoActivo;
            const rFetch = await fetch(urlFetch, { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY } });
            const dExistentes = await rFetch.json();
            let idVerdadero = (dExistentes && dExistentes.length > 0) ? dExistentes.id : null;

            if (idVerdadero) {
                await fetch(SUPABASE_URL + '/rest/v1/catalogo_imagenes?id=eq.' + idVerdadero, {
                    method: 'PATCH',
                    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ruta_imagen: urlData.publicUrl, nombre_sub_variante: nombreVariante })
                });
            } else {
                await supabaseClient.from('catalogo_imagenes').insert([{ seccion_id: seccionActiva, orden: puestoActivo.toString(), ruta_imagen: urlData.publicUrl, nombre_sub_variante: nombreVariante }]);
            }
            alert("¡Éxito! Imagen del catálogo tradicional modificada en vivo.");
        }
        
        fileInput.value = "";
        if (txtNombre) txtNombre.value = "";
        descargarYRenderizarImagenes(); 
    } catch(e) { alert("Error al procesar subida: " + e.message); }
}

// =========================================================================
// 5. RENDERIZADO DESDE LA API REST DE SUPABASE (CATÁLOGO FIJO ORIGINAL)
// =========================================================================
async function descargarYRenderizarImagenes() {
    try {
        const respuestaFetch = await fetch(SUPABASE_URL + '/rest/v1/catalogo_imagenes?select=seccion_id,orden,ruta_imagen', {
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }
        });
        const imagenesDB = await respuestaFetch.json();

        if (imagenesDB && Array.isArray(imagenesDB)) {
            imagenesDB.forEach(function(item) {
                let bloquePrefijo = "S1"; 
                if (item.seccion_id === "Seccion2") bloquePrefijo = "S2";
                if (item.seccion_id === "Seccion3") bloquePrefijo = "S3";
                if (item.seccion_id === "Seccion4") bloquePrefijo = "S4";
                if (item.seccion_id === "Seccion5") bloquePrefijo = "S5";
                if (item.seccion_id === "Seccion6") bloquePrefijo = "S6";
                if (item.seccion_id === "Seccion7") bloquePrefijo = "S7";
                if (item.seccion_id === "Seccion8") bloquePrefijo = "S8";
                if (item.seccion_id === "Seccion9") bloquePrefijo = "S9";
                if (item.seccion_id === "Seccion10") bloquePrefijo = "S10";
                if (item.seccion_id === "Seccion11") bloquePrefijo = "S11";
                if (item.seccion_id === "Seccion12") bloquePrefijo = "S12";

                const elementoImg = document.getElementById("img-" + bloquePrefijo + "-P" + item.orden);
                if (elementoImg) {
                    elementoImg.src = item.ruta_imagen + "?t=" + Date.now();
                }
            });
            console.log("¡Las 12 secciones del catálogo administrativo se renderizaron con éxito!");
        }
    } catch (err) { console.error("Error cargando imágenes:", err); }
}

// =========================================================================
// 6. CONTROL INTERACTIVO DE MÚLTIPLES DESPLEGABLES (DINÁMICO)
// =========================================================================
function toggleSeccion(idContenedor) {
    const contenedor = document.getElementById(idContenedor);
    const boton = event.currentTarget; 
    const textoBase = boton.innerHTML.replace(/[▾▴\s]/g, '');

    if (contenedor.style.display === "none" || contenedor.style.display === "") {
        contenedor.style.display = "block";
        boton.innerHTML = textoBase + " ▴";
    } else {
        contenedor.style.display = "none";
        boton.innerHTML = textoBase + " ▾";
    }
}

// =========================================================================
// 7. SUBIDA DEL ARCHIVO PDF GENERAL DEL CATÁLOGO
// =========================================================================
async function subirCatalogoPDF() {
    const pdfInput = document.getElementById('nuevoPDF');
    if (!pdfInput.files.length) return alert("Por favor, selecciona un archivo PDF.");
    const archivo = pdfInput.files; 
    const nombreUnico = Date.now() + "_" + archivo.name.normalize('NFKD').replace(/[^\w.\-]/g, '_');
    try {
        const { error: storageError } = await supabaseClient.storage.from('catalogos').upload("documentos/" + nombreUnico, archivo);
        if (storageError) throw storageError;
        const { data: urlData } = supabaseClient.storage.from('catalogos').getPublicUrl("documentos/" + nombreUnico);
        const { error: errorInsert } = await supabaseClient.from('catalogos').insert([{ titulo: "Catálogo Oficial", ruta_pdf: urlData.publicUrl, fecha_subida: new Date().toISOString() }]);
        if (errorInsert) throw errorInsert;
        alert("¡Éxito! El archivo PDF se vinculó de inmediato.");
        pdfInput.value = ""; 
    } catch (err) { alert("Error al subir el PDF: " + err.message); }
}

// =========================================================================
// 8. CARGAR Y RENDERIZAR TODOS LOS VIDEOS EN LA CUADRÍCULA INFERIOR
// =========================================================================
async function cargarCuadriculaVideosAdmin() {
    const contenedor = document.getElementById('cuadriculaVideosAdmin');
    if (!contenedor) return;
    try {
        const { data: videosDB, error } = await supabaseClient.from('videos').select('id, titulo, ruta_video');
        if (error) throw error;
        contenedor.innerHTML = '';
        if (videosDB && Array.isArray(videosDB) && videosDB.length > 0) {
            videosDB.forEach(function(video) {
                const tarjetaVideo = document.createElement('div');
                tarjetaVideo.style.cssText = "border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; padding:10px; display: flex; flex-direction: column; min-height: 220px; box-sizing: border-box;";
                tarjetaVideo.innerHTML = `
                    <div style="flex: 1; background: #000; display: flex; align-items: center; justify-content: center; min-height: 130px; max-height: 140px;">
                        <video src="${video.ruta_video}" controls style="width: 100%; max-height: 100%;" muted></video>
                    </div>
                    <div style="padding-top: 8px;">
                        <strong style="font-size: 13px; color: #1e293b; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align:center;">${video.titulo}</strong>
                        <button onclick="eliminarVideoPorId('${video.id}')" style="background-color: #dc2626; color: white; padding: 6px; border: none; border-radius: 4px; font-size: 12px; font-weight: bold; cursor: pointer; width: 100%; margin-top:8px;">Eliminar Anuncio</button>
                    </div>`;
                contenedor.appendChild(tarjetaVideo);
            });
        } else {
            contenedor.innerHTML = `<div style="grid-column: 1 / -1; color: #94a3b8; font-size: 13px; font-style: italic; text-align: center; padding: 20px 0; border: 1px dashed #e2e8f0; border-radius: 6px;">⚪ No hay videos activos.</div>`;
        }
    } catch (err) { console.error(err); }
}

async function subirNuevoVideoAnuncio() {
    const videoInput = document.getElementById('inputVideoOculto');
    if (!videoInput || !videoInput.files.length) return;
    const archivo = videoInput.files; 
    const nombreUnico = Date.now() + "_" + archivo.name.normalize('NFKD').replace(/[^\w.\-]/g, '_');
    try {
        const { error: storageError } = await supabaseClient.storage.from('catalogos').upload("videos/" + nombreUnico, archivo);
        if (storageError) throw storageError;
        const { data: urlData } = supabaseClient.storage.from('catalogos').getPublicUrl("videos/" + nombreUnico);
        const { error: errorInsert } = await supabaseClient.from('videos').insert([{ titulo: archivo.name.replace('.mp4', ''), ruta_video: urlData.publicUrl, fecha_subida: new Date().toISOString() }]);
        if (errorInsert) throw errorInsert;
        alert("¡Éxito! Video comercial incorporado.");
        videoInput.value = ""; cargarCuadriculaVideosAdmin();
    } catch (err) { alert("Error al subir video: " + err.message); }
}

async function eliminarVideoPorId(videoId) {
    if (confirm("¿Estás seguro de que deseas eliminar este video?")) {
        await supabaseClient.from('videos').delete().eq('id', videoId);
        cargarCuadriculaVideosAdmin();
    }
}

// =========================================================================
// 9. GESTOR DE PRODUCTOS MODULARES (RESCATE DIRECTO POR ÚLTIMO ID)
// =========================================================================
async function guardarProductoModularCompleto() {
    const titulo = document.getElementById('modTitulo').value.trim();
    const descripcion = document.getElementById('modDescripcion').value.trim();
    const portadaInput = document.getElementById('modPortadaFile');
    const variantesInput = document.getElementById('modVariantesFiles');

    if (!titulo) return alert("El nombre del producto es obligatorio.");

    try {
        let rutaPortadaFinal = null;
        if (portadaInput.files.length > 0) {
            const filePortada = portadaInput.files; 
            const pathPortada = "modulares/portadas/" + Date.now() + "_" + filePortada.name.normalize('NFKD').replace(/[^\w.\-]/g, '_');
            const { error: errCover } = await supabaseClient.storage.from('catalogos').upload(pathPortada, filePortada);
            if (errCover) throw errCover;
            const { data: urlCover } = supabaseClient.storage.from('catalogos').getPublicUrl(pathPortada);
            rutaPortadaFinal = urlCover.publicUrl;
        }

        let idSeguro = idProductoEdicion;
        if (idProductoEdicion) {
            const datosUpdate = { titulo: titulo, descripcion: descripcion };
            if (rutaPortadaFinal) datosUpdate.ruta_portada = rutaPortadaFinal;
            await supabaseClient.from('productos_modulares').eq('id', idProductoEdicion).update(datosUpdate);
        } else {
            if (!rutaPortadaFinal) return alert("La imagen de portada es obligatoria para un producto nuevo.");
            await supabaseClient.from('productos_modulares').insert([{ titulo: titulo, descripcion: descripcion, ruta_portada: rutaPortadaFinal }]);
            const rFetch = await fetch(SUPABASE_URL + '/rest/v1/productos_modulares?select=id', { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY } });
            const todosLosProds = await rFetch.json();
            if (todosLosProds && todosLosProds.length > 0) {
                todosLosProds.sort((a, b) => b.id - a.id);
                idSeguro = todosLosProds.id;
            }
        }

        if (variantesInput.files.length > 0) {
            for (let i = 0; i < variantesInput.files.length; i++) {
                const fileVar = variantesInput.files[i];
                const pathVar = "modulares/variantes/" + Date.now() + "_" + i + "_" + fileVar.name.normalize('NFKD').replace(/[^\w.\-]/g, '_');
                const { error: errVarUpload } = await supabaseClient.storage.from('catalogos').upload(pathVar, fileVar);
                if (!errVarUpload) {
                    const { data: urlVar } = supabaseClient.storage.from('catalogos').getPublicUrl(pathVar);
                    await supabaseClient.from('productos_modulares_fotos').insert([{ producto_id: idSeguro, ruta_foto: urlVar.publicUrl, nombre_variante: "Variante " + (i + 1) }]);
                }
            }
        }
        alert(idProductoEdicion ? "¡Producto editado correctamente!" : "¡Producto modular publicado con éxito!");
        resetearFormularioModular();
        listarModularesAdmin(); 
    } catch (err) { alert("Error: " + err.message); }
}

// =========================================================================
// 10. FUNCIONES COMPLEMENTARIAS DE EDICIÓN, LISTADO Y RESETEO
// =========================================================================
async function prepararEdicionModular(id, titulo, descripcion) {
    idProductoEdicion = id; 
    document.getElementById('modTitulo').value = titulo;
    document.getElementById('modDescripcion').value = descripcion;
    const btn = document.querySelector("button[onclick='guardarProductoModularCompleto()']");
    if (btn) { 
        btn.textContent = "💾 Guardar Cambios"; 
        btn.style.backgroundColor = "#2563eb"; 
    }
}

function resetearFormularioModular() {
    idProductoEdicion = null; 
    document.getElementById('modTitulo').value = "";
    document.getElementById('modDescripcion').value = "";
    document.getElementById('modPortadaFile').value = "";
    document.getElementById('modVariantesFiles').value = "";
    const btn = document.querySelector("button[onclick='guardarProductoModularCompleto()']");
    if (btn) { 
        btn.textContent = "🚀 Publicar Producto"; 
        btn.style.backgroundColor = "#1cbd5d"; 
    }
}

async function listarModularesAdmin() {
    const con = document.getElementById('cuadriculaModularesAdmin');
    if (!con) return;
    try {
        const rFetch = await fetch(SUPABASE_URL + '/rest/v1/productos_modulares?select=id,titulo,descripcion,ruta_portada', { 
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY } 
        });
        const data = await rFetch.json();
        con.innerHTML = '';
        if (data && Array.isArray(data)) {
            data.forEach(p => {
                const tEscapado = p.titulo.replace(/'/g, "\\'");
                const dEscapada = (p.descripcion || '').replace(/'/g, "\\'").replace(/\n/g, "\\n");
                con.innerHTML += `
                    <div style="border:1px solid #cbd5e1; border-radius:6px; padding:10px; background:#fff; text-align:center;">
                        <img src="${p.ruta_portada}?t=${Date.now()}" style="width:100%; height:100px; object-fit:cover;">
                        <strong>${p.titulo}</strong>
                        <div style="display:flex; gap:8px; margin-top:5px;">
                            <button onclick="prepararEdicionModular('${p.id}', '${tEscapado}', '${dEscapada}')" style="background:#eab308; color:#fff; border:none; padding:4px; flex:1;">Editar</button>
                            <button onclick="eliminarProductoModular('${p.id}')" style="background:#dc2626; color:#fff; border:none; padding:4px; flex:1;">Borrar</button>
                        </div>
                    </div>`;
            });
        }
    } catch(e) { console.error(e); }
}

async function eliminarProductoModular(id) {
    if (confirm("¿Estás seguro de eliminar este producto?")) {
        await supabaseClient.from('productos_modulares').eq('id', id).delete();
        listarModularesAdmin();
    }
}

// Vinculaciones obligatorias en el árbol global window al puro fondo
window.entrarAdmin = entrarAdmin;
window.toggleSeccion = toggleSeccion;
window.seleccionarPosicion = seleccionarPosicion;
window.seleccionarParaAgregarNuevaImagen = seleccionarParaAgregarNuevaImagen;
window.seleccionarParaBorrarImagenesExtra = seleccionarParaBorrarImagenesExtra;
window.subirImagenPuesto = subirImagenPuesto;
window.subirCatalogoPDF = subirCatalogoPDF;
window.cargarCuadriculaVideosAdmin = cargarCuadriculaVideosAdmin;
window.subirNuevoVideoAnuncio = subirNuevoVideoAnuncio;
window.eliminarVideoPorId = eliminarVideoPorId;
window.guardarProductoModularCompleto = guardarProductoModularCompleto;
window.prepararEdicionModular = prepararEdicionModular;
window.resetearFormularioModular = resetearFormularioModular;
window.listarModularesAdmin = listarModularesAdmin;
window.eliminarProductoModular = eliminarProductoModular;




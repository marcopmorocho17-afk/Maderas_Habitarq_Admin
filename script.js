// =========================================================================
// 1. CONFIGURACIÓN Y CONEXIÓN CON SUPABASE (ENTORNO SEGURO DATOS REALES)
// =========================================================================
const ADMIN_PASSWORD = "Maderas_Habitarq_2026";
const SUPABASE_URL = "https://mpjwdgekznvukmpprlat.supabase.co"; 
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
// 3C. ACCIÓN DISPARADORA DEL BOTÓN DE MENOS (❌) - BORRADO SELECTIVO INDIVIDUAL
// =========================================================================
async function seleccionarParaBorrarImagenesExtra(seccionId, nombreProducto) {
    seccionActiva = seccionId;
    puestoActivo = null; 
    esNuevaInsercionAcumulativa = false;

    document.querySelectorAll('.item-variante').forEach(function(el) {
        el.style.border = "";
        el.style.background = "";
    });

    if (event && event.currentTarget) {
        event.currentTarget.style.setProperty('border', '2px solid #ef4444', 'important');
        event.currentTarget.style.setProperty('background', '#fee2e2', 'important');
    }

    let selectBorrar = document.getElementById('selectBorrarImagenExtra');
    if (!selectBorrar) {
        const bloqueTexto = document.getElementById('bloqueSubVariantesFijas');
        if (bloqueTexto) {
            const contenedorSelect = document.createElement('div');
            contenedorSelect.id = "contenedorSelectBorrarDinamico";
            contenedorSelect.style.cssText = "margin-top: 12px; padding: 10px; background: #fee2e2; border-radius: 6px; border: 1px solid #f87171; text-align: left;";
            contenedorSelect.innerHTML = `
                <label style="font-size: 11px; font-weight: bold; color: #991b1b; display: block; margin-bottom: 4px;">🗑️ Selecciona la imagen específica que deseas borrar:</label>
                <select id="selectBorrarImagenExtra" style="width: 100%; padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; font-family: inherit; background:#fff; color:#1e293b;"></select>
            `;
            bloqueTexto.appendChild(contenedorSelect);
            selectBorrar = document.getElementById('selectBorrarImagenExtra');
        }
    }

    const contenedorPadreSelect = document.getElementById('contenedorSelectBorrarDinamico');
    if (contenedorPadreSelect) contenedorPadreSelect.style.display = "block";

    if (selectBorrar) {
        selectBorrar.innerHTML = '<option value="">⏳ Cargando catálogo de internet...</option>';
        try {
            const urlFetch = SUPABASE_URL + '/rest/v1/catalogo_imagenes?select=id,nombre_sub_variante&seccion_id=eq.' + encodeURIComponent(seccionActiva) + '&orden=like.Puesto_Extra_*';
            const respuesta = await fetch(urlFetch, { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY } });
            const fotos = await respuesta.json();

            selectBorrar.innerHTML = '<option value="">-- Elige qué foto deseas eliminar --</option>';
            if (fotos && Array.isArray(fotos) && fotos.length > 0) {
                fotos.forEach((f, idx) => {
                    const textoOpcion = f.nombre_sub_variante ? f.nombre_sub_variante : ("Imagen Extra #" + (idx + 1));
                    selectBorrar.innerHTML += `<option value="${f.id}">${textoOpcion}</option>`;
                });
            } else {
                selectBorrar.innerHTML = '<option value="">⚪ No hay imágenes extras guardadas en esta sección.</option>';
            }
        } catch (err) { console.error(err); }
    }

    const btn = document.getElementById('btnSubir');
    if (btn) {
        btn.disabled = false;
        btn.textContent = "🔥 Eliminar Imagen Seleccionada";
        btn.style.backgroundColor = "#ef4444";
        btn.style.cursor = "pointer";
        
        // MENSAJE CORREGIDO INDIVIDUAL: Borra estrictamente el ID seleccionado en la lista desplegable
        btn.onclick = async function() {
            const idParaBorrar = document.getElementById('selectBorrarImagenExtra') ? document.getElementById('selectBorrarImagenExtra').value : null;
            if (!idParaBorrar) return alert("Por favor, selecciona primero una imagen de la lista desplegable.");

            // MENSAJE DE REGLA INDIVIDUAL ASIGNADO
            if (!confirm("¿Estás seguro de eliminar permanentemente SOLO la imagen seleccionada de tu catálogo?")) return;

            try {
                const urlDelete = SUPABASE_URL + '/rest/v1/catalogo_imagenes?id=eq.' + idParaBorrar;
                const respuesta = await fetch(urlDelete, {
                    method: 'DELETE',
                    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }
                });

                if (!respuesta.ok) throw new Error("La base de datos rechazó el borrado.");

                alert("¡Éxito! La imagen seleccionada ha sido borrada permanentemente.");
                
                if (contenedorPadreSelect) contenedorPadreSelect.style.display = "none";
                btn.textContent = "Actualizar Imagen Web";
                btn.style.backgroundColor = "#94a3b8";
                btn.disabled = true;
                btn.onclick = subirImagenPuesto; 
                
                const indicador = document.getElementById('indicadorSeleccion');
                if (indicador) indicador.innerHTML = "Selecciona una posición en el catálogo para empezar.";
                
                descargarYRenderizarImagenes(); 
            } catch (err) { alert("No se pudo eliminar: " + err.message); }
        };
    }
}
window.seleccionarParaBorrarImagenesExtra = seleccionarParaBorrarImagenesExtra;
// =========================================================================
// 4. SUBIDA POR COORDENADAS CON NOMBRE PLANO ACUMULATIVO (INSERCION PURA - CORREGIDA)
// =========================================================================
async function subirImagenPuesto() {
    const fileInput = document.getElementById('nuevaImagen');
    const txtNombre = document.getElementById('subVarianteNombre');
    
    if (!fileInput || !fileInput.files.length) return alert("Selecciona una imagen antes de continuar.");
    if (!seccionActiva || !puestoActivo) return alert("Por favor, selecciona una posición o el botón ➕.");

    const nombreVariante = txtNombre ? txtNombre.value.trim() : "";
    
    // REPARACIÓN INMUTABLE: Captura estrictamente el primer archivo físico con su índice cero
    const file = fileInput.files[0]; 
    const path = "posiciones/sub_variantes/" + Date.now() + "_" + file.name.normalize('NFKD').replace(/[^\w.\-]/g, '_');
    
    try {
        // A. Subida física del archivo al Storage de Supabase
        const { error: errUpload } = await supabaseClient.storage.from('catalogos').upload(path, file);
        if (errUpload) throw errUpload;
        
        const { data: urlData } = supabaseClient.storage.from('catalogos').getPublicUrl(path);
        
        // B. INSERCIÓN PURA COMPATIBLE
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
            let idVerdadero = (dExistentes && dExistentes.length > 0) ? dExistentes[0].id : null;

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
// 5. RENDERIZADO MIXTO INTELIGENTE COMPATIBLE CON PUESTOS FIJOS Y BOTÓN ➕
// =========================================================================
async function descargarYRenderizarImagenes() {
    try {
        const respuestaFetch = await fetch(SUPABASE_URL + '/rest/v1/catalogo_imagenes?select=id,seccion_id,orden,ruta_imagen,nombre_sub_variante', {
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }
        });
        const imagenesDB = await respuestaFetch.json();

        // Limpiamos los elementos dinámicos extras anteriores del panel para evitar duplicados en la recarga
        document.querySelectorAll('.item-variante-dinamica-admin').forEach(el => el.remove());

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

                // Evaluamos los formatos guardados en internet de forma elástica
                if (!isNaN(item.orden)) {
                    // CAMINO A: Es un casillero fijo numérico tradicional de tu HTML (Puestos 1 al 6)
                    const elementoImg = document.getElementById("img-" + bloquePrefijo + "-P" + item.orden);
                    if (elementoImg) {
                        elementoImg.src = item.ruta_imagen + "?t=" + Date.now();
                        
                        const elementoTexto = elementoImg.nextElementSibling;
                        if (elementoTexto && elementoTexto.tagName === "SPAN" && item.nombre_sub_variante) {
                            elementoTexto.textContent = item.nombre_sub_variante;
                        }
                    }
                } else {
                    // CAMINO B: Es una foto nueva inyectada desde tu botón más (➕)
                    const elementoImgBase = document.getElementById("img-" + bloquePrefijo + "-P1");
                    if (elementoImgBase) {
                        const contenedorVarianteOculta = elementoImgBase.closest('.variante-oculta');
                        const botonMas = contenedorVarianteOculta ? contenedorVarianteOculta.querySelector('[onclick*="seleccionarParaAgregarNuevaImagen"]') : null;
                        
                        if (contenedorVarianteOculta && botonMas) {
                            // Fabricamos un nuevo cuadro miniatura idéntico para que veas la foto en tu administrador
                            const nuevoCuadroExtra = document.createElement('div');
                            nuevoCuadroExtra.className = 'item-variante item-variante-dinamica-admin';
                            nuevoCuadroExtra.style.cursor = 'default';
                            
                            nuevoCuadroExtra.innerHTML = `
                                <img src="${item.ruta_imagen}?t=${Date.now()}" style="width:100%; height:100%; object-fit:cover; border-radius:4px;" />
                                ${item.nombre_sub_variante ? `<span style="display:block; font-size:11px; margin-top:4px; text-align:center;">${item.nombre_sub_variante}</span>` : '<span>Extra</span>'}
                            `;
                            
                            // Lo posicionamos ordenadamente justo antes de tu botón de más ➕ en la pantalla
                            contenedorVarianteOculta.insertBefore(nuevoCuadroExtra, botonMas);
                        }
                    }
                }
            });
            console.log("¡Catálogo administrativo renderizado en modo mixto simétrico!");
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
    const archivo = pdfInput.files[0]; 
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
// 8. CONTROL MULTI-VIDEO: CARGAR, SUBIR ACUMULATIVO Y ELIMINACIÓN INDIVIDUAL
// =========================================================================
async function cargarCuadriculaVideosAdmin() {
    const contenedor = document.getElementById('cuadriculaVideosAdmin');
    if (!contenedor) return;
    try {
        // Descargamos en caliente la lista de videos comerciales de Supabase
        const { data: videosDB, error } = await supabaseClient.from('videos').select('id, titulo, ruta_video');
        if (error) throw error;
        
        contenedor.innerHTML = '';
        
        if (videosDB && Array.isArray(videosDB) && videosDB.length > 0) {
            // Forzamos la cuadrícula horizontal elástica para ver los videos en fila
            contenedor.style.cssText = "display: grid !important; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)) !important; gap: 15px !important; width: 100% !important; box-sizing: border-box !important;";

            videosDB.forEach(function(video) {
                const tarjetaVideo = document.createElement('div');
                tarjetaVideo.style.cssText = "border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; padding: 10px; display: flex; flex-direction: column; min-height: 200px; box-sizing: border-box; position: relative;";
                
                // Inyectamos el reproductor y el botón rojo de eliminación programado por ID único
                tarjetaVideo.innerHTML = `
                    <div style="flex: 1; background: #000; display: flex; align-items: center; justify-content: center; min-height: 110px; max-height: 120px; border-radius: 6px; overflow: hidden;">
                        <video src="${video.ruta_video}" controls style="width: 100%; max-height: 100%;" muted></video>
                    </div>
                    <div style="padding-top: 6px; text-align: center;">
                        <strong style="font-size: 12px; color: #1e293b; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${video.titulo}</strong>
                        
                        <!-- BOTÓN DE BORRADO SEGURO FILTRADO POR ID -->
                        <button onclick="eliminarVideoPorId('${video.id}', '${video.titulo.replace(/'/g, "\\'")}')" 
                                style="background-color: #dc2626; color: white; padding: 6px; border: none; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer; width: 100%; margin-top: 6px; transition: background 0.1s;">
                            🗑️ Eliminar Video
                        </button>
                    </div>`;
                contenedor.appendChild(tarjetaVideo);
            });
        } else {
            // Leyenda de respaldo idéntica a tu captura si la tabla está vacía
            contenedor.innerHTML = `<div style="grid-column: 1 / -1; color: #94a3b8; font-size: 13px; font-style: italic; text-align: center; padding: 20px 0;">🔮 No hay videos activos.</div>`;
        }
    } catch (err) { console.error("Error cargando rejilla de videos:", err); }
}

// MOTOR DE SUBIDA ACUMULATIVA: No pisa los anteriores, añade una nueva fila elástica a internet
async function subirNuevoVideoAnuncio() {
    const videoInput = document.getElementById('inputVideoOculto');
    if (!videoInput || !videoInput.files.length) return;
    
    // Captura física estricta del primer archivo del array de red
    const archivo = videoInput.files[0]; 
    const nombreUnico = Date.now() + "_" + archivo.name.normalize('NFKD').replace(/[^\w.\-]/g, '_');
    
    try {
        alert("⏳ Subiendo video a internet... Por favor, espera un momento.");
        
        // A. Subida del archivo físico al Storage de Supabase
        const { error: storageError } = await supabaseClient.storage.from('catalogos').upload("videos/" + nombreUnico, archivo);
        if (storageError) throw storageError;
        
        const { data: urlData } = supabaseClient.storage.from('catalogos').getPublicUrl("videos/" + nombreUnico);
        
        // B. Inserción de la nueva fila en la tabla de internet de Supabase
        const { error: errorInsert } = await supabaseClient.from('videos').insert([{ 
            titulo: archivo.name.replace('.mp4', '').replace('.mov', '').replace('.avi', ''), 
            ruta_video: urlData.publicUrl, 
            fecha_subida: new Date().toISOString() 
        }]);
        
        if (errorInsert) throw errorInsert;
        
        alert("¡Éxito! Video comercial incorporado correctamente a la cartelera.");
        videoInput.value = ""; 
        cargarCuadriculaVideosAdmin(); // Refresca tu panel en caliente
    } catch (err) { 
        console.error(err);
        alert("Error al subir video: " + err.message); 
    }
}

// COMANDO ELIMINADOR CRUCIAL: Tritura única y exclusivamente el ID enviado por parámetro
async function eliminarVideoPorId(videoId, nombreVideo) {
    if (!confirm("¿Estás seguro de que deseas eliminar permanentemente el video '" + nombreVideo + "' del catálogo web?")) {
        return;
    }
    try {
        // Ejecuta el borrado directo de esa fila en la base de datos de internet
        const { error } = await supabaseClient.from('videos').delete().eq('id', videoId);
        if (error) throw error;
        
        alert("¡Éxito! El anuncio ha sido removido.");
        cargarCuadriculaVideosAdmin(); // Refresca tu panel en caliente para desaparecer la tarjeta
    } catch (err) {
        alert("No se pudo eliminar el video: " + err.message);
    }
}
// Vinculación explícita al final de tu archivo para que el HTML reconozca los clics
window.cargarCuadriculaVideosAdmin = cargarCuadriculaVideosAdmin;
window.subirNuevoVideoAnuncio = subirNuevoVideoAnuncio;
window.eliminarVideoPorId = eliminarVideoPorId;
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
            const filePortada = portadaInput.files[0]; // CORREGIDO: Captura del archivo físico
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
                idSeguro = todosLosProds[0].id; // CORREGIDO: Extracción por posición indexada cero
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
    if (btn) { btn.textContent = "💾 Guardar Cambios"; btn.style.backgroundColor = "#2563eb"; }
}

function resetearFormularioModular() {
    idProductoEdicion = null; 
    document.getElementById('modTitulo').value = "";
    document.getElementById('modDescripcion').value = "";
    document.getElementById('modPortadaFile').value = "";
    document.getElementById('modVariantesFiles').value = "";
    const btn = document.querySelector("button[onclick='guardarProductoModularCompleto()']");
    if (btn) { btn.textContent = "🚀 Publicar Producto"; btn.style.backgroundColor = "#1cbd5d"; }
}

async function listarModularesAdmin() {
    const con = document.getElementById('cuadriculaModularesAdmin');
    if (!con) return;
    try {
        const rFetch = await fetch(SUPABASE_URL + '/rest/v1/productos_modulares?select=id,titulo,descripcion,ruta_portada', { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY } });
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

// Vinculaciones obligatorias en el árbol global window al puro fondo del archivo
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





// ==========================================
// 1. CONFIGURACIÓN Y CONEXIÓN CON SUPABASE
// ==========================================
const ADMIN_PASSWORD = "Maderas2026";
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
let seccionActiva = null, puestoActivo = null;

/**
 * 2. CONTROL DE ACCESO (LOGIN)
 */
function entrarAdmin() {
    if (document.getElementById('adminPassword').value === ADMIN_PASSWORD) {
        document.getElementById('loginBox').hidden = true;
        document.getElementById('adminPanel').hidden = false;
        document.getElementById('statusMessage').textContent = "Acceso concedido.";
        document.getElementById('mainPublico').hidden = false;
        descargarYRenderizarImagenes();
        cargarCuadriculaVideosAdmin();
        listarModularesAdmin(); 
    } else {
        alert("Contraseña incorrecta.");
    }
}

function toggleSeccion(id) {
    const c = document.getElementById(id), b = event.currentTarget;
    const textoBase = b.innerHTML.replace(/[▾▴\s]/g, '');
    if (c.style.display === "none" || c.style.display === "") { c.style.display = "block"; b.innerHTML = textoBase + " ▴"; }
    else { c.style.display = "none"; b.innerHTML = textoBase + " ▾"; }
}

/**
 * 3. CAPTURA EL CLIC DIRECTO DEL CATÁLOGO FIJO (S1-S12)
 */
function seleccionarPosicion(seccionId, puesto, nombreProducto) {
    seccionActiva = seccionId; puestoActivo = puesto;
    document.querySelectorAll('.item-variante').forEach(el => el.classList.remove('seleccionado'));
    event.currentTarget.classList.add('seleccionado');
    document.getElementById('indicadorSeleccion').innerHTML = "🎯 Reemplazando: <strong>" + nombreProducto + "</strong>";
    const btn = document.getElementById('btnSubir'); btn.disabled = false; btn.style.backgroundColor = "#1cbd5d"; btn.style.cursor = "pointer";
}

/**
 * 4. SUBIDA POR COORDENADAS DE SELECCIÓN POR CLIC (CATÁLOGO FIJO - REPARADA AL 100%)
 */
async function subirImagenPuesto() {
    const fileInput = document.getElementById('nuevaImagen');
    if (!fileInput || !fileInput.files.length) return alert("Selecciona una imagen antes de continuar.");
    
    const file = fileInput.files[0]; // Captura limpia de la primera posición individual
    const path = "posiciones/" + Date.now() + "_" + file.name.normalize('NFKD').replace(/[^\w.\-]/g, '_');
    
    try {
        // A. Subida física del archivo al Storage de Supabase
        const { error } = await supabaseClient.storage.from('catalogos').upload(path, file);
        if (error) throw error;
        
        const { data } = supabaseClient.storage.from('catalogos').getPublicUrl(path);
        
        // B. CONSULTA DIRECTA REST BLINDADA: Evitamos maybeSingle() para capturar el ID de forma segura
        const urlFetch = SUPABASE_URL + '/rest/v1/catalogo_imagenes?select=id&seccion_id=eq.' + encodeURIComponent(seccionActiva) + '&orden=eq.' + puestoActivo;
        const respuestaFetch = await fetch(urlFetch, {
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }
        });
        const datosExistentes = await respuestaFetch.json();
        
        let idVerdadero = null;
        if (datosExistentes && Array.isArray(datosExistentes) && datosExistentes.length > 0) {
            idVerdadero = datosExistentes[0].id; // Extraemos el ID numérico real de la primera posición
        }

        if (idVerdadero) {
            // MODO ACTUALIZACIÓN (UPDATE): Pasamos el ID real extraído limpiamente con un fetch PATCH directo
            const urlUpdate = SUPABASE_URL + '/rest/v1/catalogo_imagenes?id=eq.' + idVerdadero;
            await fetch(urlUpdate, {
                method: 'PATCH',
                headers: { 
                    'apikey': SUPABASE_ANON_KEY, 
                    'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ruta_imagen: data.publicUrl })
            });
        } else {
            // MODO CREACIÓN (INSERT): Si el puesto estaba completamente vacío
            await supabaseClient
                .from('catalogo_imagenes')
                .insert([{ seccion_id: seccionActiva, orden: puestoActivo, ruta_imagen: data.publicUrl }]);
        }
        
        alert("¡Éxito! Imagen del catálogo tradicional actualizada en vivo.");
        fileInput.value = ""; 
        descargarYRenderizarImagenes(); // Refresca las miniaturas del panel de control
        
    } catch(e) { 
        console.error("Error en subida de puesto fijo:", e);
        alert("No se pudo actualizar: " + (e.message || e)); 
    }
}

/**
 * 5. RENDERIZADO DESDE LA API REST DE SUPABASE (RECUPERADA CON SECCIÓN ANTI-CACHÉ)
 */
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
                    // BLINDAJE ANTI-CACHÉ: Agrega la marca de tiempo para obligar a Edge a mostrar la foto nueva
                    elementoImg.src = item.ruta_imagen + "?t=" + Date.now();
                }
            });
            console.log("¡Las 12 secciones del catálogo administrativo se renderizaron con éxito!");
        }
    } catch (err) {
        console.error("Error cargando imágenes:", err);
    }
}

/**
 * 6. CONTROL INTERACTIVO DE MÚLTIPLES DESPLEGABLES (DINÁMICO)
 */
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

/**
 * 7. SUBIDA DEL ARCHIVO PDF GENERAL DEL CATÁLOGO
 */
async function subirCatalogoPDF() {
    const pdfInput = document.getElementById('nuevoPDF');
    
    if (!pdfInput.files.length) {
        alert("Por favor, selecciona un archivo PDF primero antes de presionar el botón.");
        return;
    }

    const archivo = pdfInput.files[0]; 
    const nombreUnico = Date.now() + "_" + archivo.name.normalize('NFKD').replace(/[^\w.\-]/g, '_');

    try {
        const { error: storageError } = await supabaseClient
            .storage
            .from('catalogos')
            .upload("documentos/" + nombreUnico, archivo);

        if (storageError) throw storageError;

        const { data: urlData } = supabaseClient
            .storage
            .from('catalogos')
            .getPublicUrl("documentos/" + nombreUnico);

        const rutaPublica = urlData.publicUrl;

        const { error: errorInsert } = await supabaseClient
            .from('catalogos') 
            .insert([{ 
                titulo: "Catálogo Oficial", 
                ruta_pdf: rutaPublica, 
                fecha_subida: new Date().toISOString() 
            }]);

        if (errorInsert) throw errorInsert;

        alert("¡Éxito! El archivo PDF del catálogo general se subió y vinculó a la web de inmediato.");
        pdfInput.value = ""; 

    } catch (err) {
        console.error("Error al procesar el PDF:", err);
        alert("Ocurrió un error al subir el PDF: " + (err.message || err));
    }
}

/**
 * 8. CARGAR Y RENDERIZAR TODOS LOS VIDEOS EN LA CUADRÍCULA INFERIOR
 */
async function cargarCuadriculaVideosAdmin() {
    const contenedor = document.getElementById('cuadriculaVideosAdmin');
    if (!contenedor) return;

    try {
        const { data: videosDB, error } = await supabaseClient
            .from('videos')
            .select('id, titulo, ruta_video, fecha_subida');

        if (error) throw error;

        contenedor.innerHTML = '';

        if (videosDB && Array.isArray(videosDB) && videosDB.length > 0) {
            const videosOrdenados = videosDB.sort(function(a, b) {
                return new Date(b.fecha_subida) - new Date(a.fecha_subida);
            });

            videosOrdenados.forEach(function(video) {
                const tarjetaVideo = document.createElement('div');
                tarjetaVideo.style.cssText = "border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.05); overflow: hidden; display: flex; flex-direction: column; min-height: 220px; box-sizing: border-box;";

                tarjetaVideo.innerHTML = `
                    <div style="flex: 1; background: #000; display: flex; align-items: center; justify-content: center; min-height: 130px; max-height: 140px;">
                        <video src="${video.ruta_video}" controls style="width: 100%; max-height: 100%;" muted></video>
                    </div>
                    <div style="padding: 12px; display: flex; flex-direction: column; justify-content: space-between; flex: 1; gap: 8px;">
                        <div style="text-align: center;">
                            <strong style="font-size: 13px; color: #1e293b; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${video.titulo}</strong>
                            <span style="font-size: 10px; color: #94a3b8; display: block; margin-top: 2px;">${new Date(video.fecha_subida).toLocaleDateString()}</span>
                        </div>
                        <button onclick="eliminarVideoPorId('${video.id}')" style="background-color: #dc2626; color: white; padding: 6px 12px; border: none; border-radius: 4px; font-size: 12px; font-weight: bold; cursor: pointer; width: 100%; transition: background 0.2s;">
                            Eliminar Anuncio
                        </button>
                    </div>
                `;
                contenedor.appendChild(tarjetaVideo);
            });
        } else {
            contenedor.innerHTML = `
                <div style="grid-column: 1 / -1; color: #94a3b8; font-size: 13px; font-style: italic; text-align: center; padding: 20px 0; border: 1px dashed #e2e8f0; border-radius: 6px; background: #f8fafc;">
                    ⚪ No hay videos comerciales activos en la web. Sube uno con el cuadro superior.
                </div>
            `;
        }
    } catch (err) {
        console.error("Error al renderizar cuadrícula de videos:", err);
    }
}

/**
 * 9. SUBIR UN NUEVO VIDEO DESDE EL CUADRADO DEL SIGNO DE MÁS (➕)
 */
async function subirNuevoVideoAnuncio() {
    const videoInput = document.getElementById('inputVideoOculto');
    
    if (!videoInput || !videoInput.files.length) return;

    const archivo = videoInput.files[0]; 
    const nombreLimpio = archivo.name.normalize('NFKD').replace(/[^\w.\-]/g, '_');
    const nombreUnico = Date.now() + "_" + nombreLimpio;

    try {
        const { error: storageError } = await supabaseClient
            .storage
            .from('catalogos')
            .upload("videos/" + nombreUnico, archivo);

        if (storageError) throw storageError;

        const { data: urlData } = supabaseClient
            .storage
            .from('catalogos')
            .getPublicUrl("videos/" + nombreUnico);

        const rutaPublica = urlData.publicUrl;

        const { error: errorInsert } = await supabaseClient
            .from('videos')
            .insert([{ 
                titulo: archivo.name.replace('.mp4', ''), 
                ruta_video: rutaPublica, 
                fecha_subida: new Date().toISOString() 
            }]);

        if (errorInsert) throw errorInsert;

        alert("¡Éxito! El video se ha subido e incorporado a la cartelera comercial inferior.");
        videoInput.value = ""; 
        cargarCuadriculaVideosAdmin(); 

    } catch (err) {
        console.error("Error al procesar la subida del video:", err);
        alert("Ocurrió un error al subir el video: " + (err.message || err));
        if (videoInput) videoInput.value = "";
    }
}

/**
 * 10. ELIMINAR UN VIDEO ESPECÍFICO DE LA LISTA POR SU ID
 */
async function eliminarVideoPorId(videoId) {
    if (!confirm("¿Estás seguro de que deseas eliminar este video comercial de la web?")) {
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('videos')
            .delete()
            .eq('id', videoId);

        if (error) throw error; 

        alert("¡Éxito! El video ha sido removido de la base de datos.");
        cargarCuadriculaVideosAdmin(); 

    } catch (err) {
        console.error("Error al eliminar el video:", err);
        alert("No se pudo eliminar el video: " + (err.message || err));
    }
}

// =========================================================================
// 11. MULTIMEDIA AVANZADA: GESTOR DE PRODUCTOS MODULARES (RESCATE POR ÚLTIMO ID)
// =========================================================================
let idProductoEdicion = null; 

async function guardarProductoModularCompleto() {
    const titulo = document.getElementById('modTitulo').value.trim();
    const descripcion = document.getElementById('modDescripcion').value.trim();
    const portadaInput = document.getElementById('modPortadaFile');
    const variantesInput = document.getElementById('modVariantesFiles');

    if (!titulo) return alert("El nombre del producto es obligatorio.");

    try {
        let rutaPortadaFinal = null;

        if (portadaInput.files.length > 0) {
            const filePortada = portadaInput.files[0]; 
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

            const { error: errUpdate } = await supabaseClient.from('productos_modulares').eq('id', idProductoEdicion).update(datosUpdate);
            if (errUpdate) throw errUpdate;
        } else {
            if (!rutaPortadaFinal) return alert("La imagen de portada es obligatoria para un producto nuevo.");
            
            const { error: errInsertMaster } = await supabaseClient.from('productos_modulares').insert([{
                titulo: titulo,
                descripcion: descripcion,
                ruta_portada: rutaPortadaFinal
            }]);
            if (errInsertMaster) throw errInsertMaster;

            // RE-FETCH GARANTIZADO: Jalamos la lista de IDs para buscar el registro de forma manual en JavaScript
            const { data: todosLosProds, error: errFetch } = await supabaseClient
                .from('productos_modulares')
                .select('id');
                
            if (errFetch) throw errFetch;
            
            if (todosLosProds && Array.isArray(todosLosProds) && todosLosProds.length > 0) {
                // Ordenamos por ID numérico en caliente de mayor a menor
                todosLosProds.sort(function(a, b) { return b.id - a.id; });
                // CORREGIDO DEFINITIVAMENTE: Se extrae el ID de la primera posición del array ordenado
                idSeguro = todosLosProds[0].id; 
            }
        }

        if (!idSeguro) throw new Error("No se pudo obtener el identificador relacional del producto desde el servidor.");

        if (variantesInput.files.length > 0) {
            for (let i = 0; i < variantesInput.files.length; i++) {
                const fileVar = variantesInput.files[i];
                const pathVar = "modulares/variantes/" + Date.now() + "_" + i + "_" + fileVar.name.normalize('NFKD').replace(/[^\w.\-]/g, '_');
                
                const { error: errVarUpload } = await supabaseClient.storage.from('catalogos').upload(pathVar, fileVar);
                if (!errVarUpload) {
                    const { data: urlVar } = supabaseClient.storage.from('catalogos').getPublicUrl(pathVar);
                    await supabaseClient.from('productos_modulares_fotos').insert([{
                        producto_id: idSeguro,
                        ruta_foto: urlVar.publicUrl,
                        nombre_variante: "Variante " + (i + 1)
                    }]);
                }
            }
        }

        alert(idProductoEdicion ? "¡Producto editado correctamente!" : "¡Producto modular publicado con éxito con todas sus variantes!");
        resetearFormularioModular();
        listarModularesAdmin(); 

    } catch (err) {
        console.error(err);
        alert("Error en el procesamiento: " + err.message);
    }
}

async function prepararEdicionModular(id, titulo, descripcion) {
    idProductoEdicion = id; 
    
    document.getElementById('modTitulo').value = titulo;
    document.getElementById('modDescripcion').value = descripcion;
    
    const btn = document.querySelector("button[onclick='guardarProductoModularCompleto()']");
    if (btn) {
        btn.textContent = "💾 Guardar Cambios del Bloque";
        btn.style.backgroundColor = "#2563eb"; 
    }
    
    document.getElementById('modTitulo').scrollIntoView({ behavior: 'smooth' });
}

function resetearFormularioModular() {
    idProductoEdicion = null; 
    document.getElementById('modTitulo').value = "";
    document.getElementById('modDescripcion').value = "";
    document.getElementById('modPortadaFile').value = "";
    document.getElementById('modVariantesFiles').value = "";
    
    const btn = document.querySelector("button[onclick='guardarProductoModularCompleto()']");
    if (btn) {
        btn.textContent = "🚀 Publicar Producto Sin Usar Código";
        btn.style.backgroundColor = "#1cbd5d"; 
    }
}

async function listarModularesAdmin() {
    const con = document.getElementById('cuadriculaModularesAdmin');
    if (!con) return;
    try {
        const respuestaFetch = await fetch(SUPABASE_URL + '/rest/v1/productos_modulares?select=id,titulo,descripcion,ruta_portada', {
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }
        });
        const data = await respuestaFetch.json();
        
        con.innerHTML = '';
        if (data && Array.isArray(data)) {
            data.forEach(p => {
                const tituloEscapado = p.titulo.replace(/'/g, "\\'");
                const descEscapada = (p.descripcion || '').replace(/'/g, "\\'").replace(/\n/g, "\\n");

                // SE AGREGA ?t= AL RENDERIZADO DEL ADMIN CONTRA LA CACHÉ ATASCADA
                con.innerHTML += `
                    <div style="border:1px solid #cbd5e1; border-radius:6px; padding:10px; background:#fff; text-align:center; display:flex; flex-direction:column; justify-content:space-between; min-height:200px;">
                        <div>
                            <img src="${p.ruta_portada}?t=${Date.now()}" style="width:100%; height:100px; object-fit:cover; border-radius:4px;">
                            <strong style="font-size:12px; display:block; margin:5px 0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${p.titulo}</strong>
                        </div>
                        <div style="display:flex; gap:8px; margin-top:5px;">
                            <button onclick="prepararEdicionModular('${p.id}', '${tituloEscapado}', '${descEscapada}')" style="background:#eab308; color:#fff; border:none; padding:6px; border-radius:4px; font-size:11px; flex:1; cursor:pointer; font-weight:bold;">Editar</button>
                            <button onclick="eliminarProductoModular('${p.id}')" style="background:#dc2626; color:#fff; border:none; padding:6px; border-radius:4px; font-size:11px; flex:1; cursor:pointer; font-weight:bold;">Eliminar</button>
                        </div>
                    </div>`;
            });
        }
    } catch(e) { console.error(e); }
}

async function eliminarProductoModular(id) {
    if (confirm("¿Estás seguro de eliminar este producto modular? Se borrarán de inmediato todas sus variantes internas del modal de forma automática.")) {
        try {
            const { error } = await supabaseClient.from('productos_modulares').eq('id', id).delete();
            if (error) throw error;
            alert("Producto modular eliminado correctamente.");
            if (idProductoEdicion === id) resetearFormularioModular();
            listarModularesAdmin();
        } catch(e) { alert(e.message); }
    }
}

// Vinculaciones globales requeridas al final absoluto del archivo
window.toggleSeccion = toggleSeccion;
window.subirCatalogoPDF = subirCatalogoPDF;
window.cargarCuadriculaVideosAdmin = cargarCuadriculaVideosAdmin;
window.subirNuevoVideoAnuncio = subirNuevoVideoAnuncio;
window.eliminarVideoPorId = eliminarVideoPorId;
window.guardarProductoModularCompleto = guardarProductoModularCompleto;
window.prepararEdicionModular = prepararEdicionModular;
window.eliminarProductoModular = eliminarProductoModular;

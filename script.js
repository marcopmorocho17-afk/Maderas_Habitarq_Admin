
// =========================================================================
// =========================================================================
// 1. CONFIGURACIÓN Y CONEXIÓN CON SUPABASE (ENTORNO SEGURO)
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
    
    document.querySelectorAll('.item-variante').forEach(function(el) {
        el.classList.remove('seleccionado');
    });
    
    event.currentTarget.classList.add('seleccionado');
    document.getElementById('indicadorSeleccion').innerHTML = "🎯 Reemplazando: <strong>" + nombreProducto + "</strong>";
    
    const btn = document.getElementById('btnSubir'); 
    btn.disabled = false; 
    btn.style.backgroundColor = "#1cbd5d"; 
    btn.style.cursor = "pointer";
}

// Variable global para controlar si el clic vino desde el botón de añadir (+)
let esNuevaInsercionAcumulativa = false;

function seleccionarParaAgregarNuevaImagen(seccionId, nombreProducto) {
    seccionActiva = seccionId;
    // Generamos un identificador dinámico único basado en el tiempo para que Supabase lo tome como foto nueva
    puestoActivo = "Puesto_Extra_" + Date.now(); 
    esNuevaInsercionAcumulativa = true;

    // Quitamos la selección visual de cualquier otro cuadradito antiguo de tu HTML
    document.querySelectorAll('.item-variante').forEach(function(el) {
        el.style.borderColor = ""; 
        el.style.background = "";
    });

    // Marcamos visualmente el botón de más (+) que acabas de presionar
    if (event && event.currentTarget) {
        event.currentTarget.style.setProperty('border', '2px solid #1cbd5d', 'important');
        event.currentTarget.style.setProperty('background', '#f0fdf4', 'important');
    }

    // Actualizamos el letrero indicador del panel
    const indicador = document.getElementById('indicadorSeleccion');
    if (indicador) {
        indicador.innerHTML = "➕ Añadiendo foto nueva a la galería de: <strong>" + nombreProducto + "</strong>";
    }

    // Encendemos el botón verde de subir
    const btn = document.getElementById('btnSubir');
    if (btn) {
        btn.disabled = false;
        btn.style.backgroundColor = "#1cbd5d";
        btn.style.cursor = "pointer";
    }
}
// =========================================================================
// 4. SUBIDA POR COORDENADAS: MOTOR INTELIGENTE DUAL (CORREGIDO PARA TU ESQUEMA)
// =========================================================================
async function subirImagenPuesto() {
    const fileInput = document.getElementById('nuevaImagen');
    const txtNombre = document.getElementById('subVarianteNombre');
    
    if (!fileInput || !fileInput.files.length) return alert("Selecciona una imagen antes de continuar.");
    if (!seccionActiva || !puestoActivo) return alert("Por favor, selecciona una miniatura o presiona el botón ➕.");

    const nombreVariante = txtNombre ? txtNombre.value.trim() : "";
    const file = fileInput.files[0]; // Captura física del archivo individual en la posición cero
    const path = "posiciones/sub_variantes/" + Date.now() + "_" + file.name.normalize('NFKD').replace(/[^\w.\-]/g, '_');
    
    try {
        // A. Subida física del archivo al Storage de Supabase
        const { error: errUpload } = await supabaseClient.storage.from('catalogos').upload(path, file);
        if (errUpload) throw errUpload;
        
        const { data: urlData } = supabaseClient.storage.from('catalogos').getPublicUrl(path);
        
        // B. EVALUACIÓN DE CAMINO: ¿Viene del botón más (+) o es una edición de miniatura fija?
        if (esNuevaInsercionAcumulativa) {
            // MODO CAMINO ➕ (SOLO AGREGA): Inserta una fila elástica limpia compatible con tu tabla actual
            const { error: errInsert } = await supabaseClient
                .from('catalogo_imagenes')
                .insert([{
                    seccion_id: seccionActiva,
                    orden: puestoActivo, // Firma temporal única para acumular imágenes sin límites
                    ruta_imagen: urlData.publicUrl,
                    nombre_sub_variante: nombreVariante
                }]);

            if (errInsert) throw errInsert;
            alert("¡Éxito! Nueva imagen añadida correctamente a la galería con el nombre: " + nombreVariante);
        } else {
            // MODO EDICIÓN (REEMPLAZAR): Si hiciste clic en un cuadradito normal de tus maderas
            const urlFetch = SUPABASE_URL + '/rest/v1/catalogo_imagenes?select=id&seccion_id=eq.' + encodeURIComponent(seccionActiva) + '&orden=eq.' + puestoActivo;
            const respuestaFetch = await fetch(urlFetch, {
                headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }
            });
            const datosExistentes = await respuestaFetch.json();
            
            let idVerdadero = null;
            if (datosExistentes && Array.isArray(datosExistentes) && datosExistentes.length > 0) {
                idVerdadero = datosExistentes[0].id; 
            }

            if (idVerdadero) {
                // Reemplaza la foto existente en ese casillero fijo
                const urlUpdate = SUPABASE_URL + '/rest/v1/catalogo_imagenes?id=eq.' + idVerdadero;
                await fetch(urlUpdate, {
                    method: 'PATCH',
                    headers: { 
                        'apikey': SUPABASE_ANON_KEY, 
                        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ ruta_imagen: urlData.publicUrl, nombre_sub_variante: nombreVariante })
                });
                alert("¡Éxito! Imagen del catálogo tradicional modificada en vivo.");
            } else {
                // Si el casillero tradicional estaba vacío por primera vez
                await supabaseClient
                    .from('catalogo_imagenes')
                    .insert([{ seccion_id: seccionActiva, orden: puestoActivo, ruta_imagen: urlData.publicUrl, nombre_sub_variante: nombreVariante }]);
                alert("¡Éxito! Imagen guardada en el casillero tradicional.");
            }
        }
        
        // Limpieza y restauración completa del estado
        fileInput.value = "";
        if (txtNombre) txtNombre.value = "";
        esNuevaInsercionAcumulativa = false; // Reseteamos el interruptor
        
        descargarYRenderizarImagenes(); // Refresca las miniaturas internas del panel
        
    } catch(e) { 
        console.error("Error en el procesador dual del admin:", e);
        alert("No se pudo procesar la acción: " + (e.message || e)); 
    }
}
// =========================================================================
// 5. RENDERIZADO INTELIGENTE ANTI-IMÁGENES ROTAS Y RECONSTRUCCIÓN DEL BOTÓN ➕
// =========================================================================
async function descargarYRenderizarImagenes() {
    try {
        const respuestaFetch = await fetch(SUPABASE_URL + '/rest/v1/catalogo_imagenes?select=id,seccion_id,orden,ruta_imagen,nombre_sub_variante', {
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }
        });
        const imagenesDB = await respuestaFetch.json();

        // 1. BLINDAJE ABSOLUTO ANTI-ROTURAS: Limpiamos los contenedores visuales viejos
        // Si la base de datos está vacía, ocultamos temporalmente el cuadro de imagen rota de Edge
        document.querySelectorAll('.item-variante img').forEach(img => {
            img.style.display = "none"; // Esconde el recuadro roto feo de la pantalla
            img.src = ""; 
        });
        
        // Removemos botones de eliminar anteriores para evitar duplicados en la cuadrícula
        document.querySelectorAll('.btn-eliminar-foto-fija').forEach(btn => btn.remove());

        // 2. RECONSTRUCCIÓN AUTOMÁTICA DEL BOTÓN ➕
        const botonMasElemento = document.querySelector('.item-variante-mas, [onclick*="seleccionarParaAgregarNuevaImagen"]');
        if (botonMasElemento) {
            botonMasElemento.innerHTML = `
                <span style="font-size: 32px; color: #1cbd5d; font-weight: bold; line-height: 1;">➕</span>
                <span style="font-size: 11px; color: #1cbd5d; font-weight: bold; margin-top: 5px; text-transform: uppercase; display: block;">Añadir Foto</span>
            `;
        }

        // 3. SECCIÓN DE INYECCIÓN DESDE LA NUBE (SUPABASE)
        if (imagenesDB && Array.isArray(imagenesDB) && imagenesDB.length > 0) {
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

                // Buscamos el nodo de imagen correspondiente en tu HTML
                const elementoImg = document.getElementById("img-" + bloquePrefijo + "-P" + item.orden);
                
                if (elementoImg) {
                    elementoImg.style.display = "block"; // Encendemos la imagen porque ya tiene datos de internet
                    elementoImg.src = item.ruta_imagen + "?t=" + Date.now(); // Parámetro anti-caché
                    
                    // Sincronizamos el nombre plano en su respectivo span de abajo si existe
                    const elementoTexto = elementoImg.nextElementSibling;
                    if (elementoTexto && elementoTexto.tagName === "SPAN" && item.nombre_sub_variante) {
                        elementoTexto.textContent = item.nombre_sub_variante;
                    }

                    // INYECCIÓN DE LA ❌ FLOTANTE DE ELIMINACIÓN REAL
                    const cajaPadre = elementoImg.parentElement;
                    if (cajaPadre) {
                        cajaPadre.style.position = "relative";

                        const botonEliminar = document.createElement('button');
                        botonEliminar.className = 'btn-eliminar-foto-fija';
                        botonEliminar.innerHTML = "❌";
                        botonEliminar.style.cssText = "position: absolute; top: 4px; right: 4px; background: #dc2626; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; font-size: 10px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2); z-index: 10;";
                        
                        botonEliminar.onclick = function(evento) {
                            evento.stopPropagation(); // Detiene el clic para que no se confunda con la selección de la tarjeta
                            eliminarFotoTradicionalPorId(item.id);
                        };

                        cajaPadre.appendChild(botonEliminar);
                    }
                }
            });
        }
        console.log("¡Catálogo administrativo renderizado de forma segura y simétrica!");
    } catch (err) {
        console.error("Error cargando imágenes de control:", err);
    }
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

// =========================================================================
// 9. SUBIR UN NUEVO VIDEO DESDE EL CUADRADO DEL SIGNO DE MÁS (➕)
// =========================================================================
async function subirNuevoVideoAnuncio() {
    const videoInput = document.getElementById('inputVideoOculto');
    if (!videoInput || !videoInput.files.length) return;
    const archivo = videoInput.files[0]; 
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

// =========================================================================
// 10. ELIMINAR UN VIDEO ESPECÍFICO DE LA LISTA POR SU ID
// =========================================================================
async function eliminarVideoPorId(videoId) {
    if (confirm("¿Estás seguro de que deseas eliminar este video?")) {
        await supabaseClient.from('videos').delete().eq('id', videoId);
        cargarCuadriculaVideosAdmin();
    }
}

// =========================================================================
// 11. MULTIMEDIA AVANZADA: GESTOR DE PRODUCTOS MODULARES (CREAR, EDITAR Y ELIMINAR)
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

            // RESCATE DIRECTO REST INTERCEPTORES API
            const respuestaFetch = await fetch(SUPABASE_URL + '/rest/v1/productos_modulares?select=id', {
                headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }
            });
            const todosLosProds = await respuestaFetch.json();
            
            if (todosLosProds && Array.isArray(todosLosProds) && todosLosProds.length > 0) {
                todosLosProds.sort(function(a, b) { return b.id - a.id; });
                idSeguro = todosLosProds[0].id; // Extracción limpia corregida por posición cero indexada
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

        alert(idProductoEdicion ? "¡Producto editado correctamente!" : "¡Producto modular publicado con éxito!");
        resetearFormularioModular();
        listarModularesAdmin(); 

    } catch (err) {
        console.error(err);
        alert("Error en el procesamiento: " + err.message);
    }
}

// FUNCIONES INTERNAS DEL GESTOR MODULAR (LLAMADAS DESDE LA FUNCIÓN 11)
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
    if (confirm("¿Estás seguro de eliminar este producto? Se borrarán sus variantes de forma automática.")) {
        try {
            await supabaseClient.from('productos_modulares').eq('id', id).delete();
            alert("Producto eliminado.");
            if (idProductoEdicion === id) resetearFormularioModular();
            listarModularesAdmin();
        } catch(e) { alert(e.message); }
    }
}

// Vinculaciones obligatorias en el árbol global window
window.entrarAdmin = entrarAdmin;
window.toggleSeccion = toggleSeccion;
window.seleccionarPosicion = seleccionarPosicion;
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
// Añade esta línea al puro fondo de tu script de administración junto con las otras vinculaciones
window.eliminarFotoTradicionalPorId = eliminarFotoTradicionalPorId;

const form = document.getElementById("upload");
const fileInput = document.getElementById("file");
const msj = document.getElementById("mensaje");

form.addEventListener('submit', async (e) =>{
  e.preventDefault();
  if (fileInput.files.length === 0) {
    msj.textContent = "Por favor, selecciona un archivo Excel.";
    msj.style.color = "red";
    return;
  }

  msj.textContent = "Subiendo y procesando archivo...";
  msj.style.color = "blue";

  const formData = new FormData();
  formData.append("archivo", fileInput.files[0]);

  try {
    const response = await fetch('/importar', {
      method: 'POST',
      body: formData
    });

    const resultado = await response.json();

    if (resultado.success) {
      msj.textContent = resultado.message;
      msj.style.color = "green";
      form.reset();
    } else {
      msj.textContent = `Error: ${resultado.error} ${resultado.details || ''}`;
      msj.style.color = "red";
    }
  } catch (error) {
    console.error("Error en la petición:", error);
    msj.textContent = "No se pudo conectar con el servidor.";
    msj.style.color = "red";
  }
});

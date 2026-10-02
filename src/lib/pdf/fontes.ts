import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
// pdfmake 0.2 entrega diretamente o mapa de arquivos; o pacote de tipos descreve a versão antiga.
pdfMake.vfs = pdfFonts as unknown as Record<string, string>;
export default pdfMake;

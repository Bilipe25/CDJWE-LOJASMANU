import { criarDefinicaoListaSaidas, gerarDocumentoFinanceiro, type SaidaDocumento, type ColunaSaida } from './financeiro-pdf';
import type { DadosEmpresaDocumento } from '@/lib/utils/documentos';
export async function exportarSaidasParaPDF(saidas: SaidaDocumento[], colunas: ColunaSaida[], empresa: DadosEmpresaDocumento, criterios: string[] = []) {
  await gerarDocumentoFinanceiro(criarDefinicaoListaSaidas(saidas, colunas, empresa, criterios), 'saidas-financeiras.pdf', 'download');
}

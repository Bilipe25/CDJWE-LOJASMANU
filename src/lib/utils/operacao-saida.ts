export interface FormularioSaida {
  cliente_id: string; destinatario_nome: string; forma_pagamento_id: string;
  valor: number; data: string; observacao: string; status: 'PENDENTE' | 'CONFIRMADO';
}
// Conserva chave e destinatário criado entre tentativas; uma mudança depois de uma
// resposta incerta não pode reutilizar a chave de uma despesa diferente.
export class OperacaoSaida {
  private emCurso = false;
  private chave?: string;
  private assinatura?: string;
  private clienteCriado?: string;
  async executar<T>(formulario: FormularioSaida, criarCliente: (nome: string) => Promise<string>, salvar: (dados: FormularioSaida & { chave_requisicao: string }) => Promise<T>) {
    if (this.emCurso) return undefined;
    this.emCurso = true;
    try {
      const assinatura = JSON.stringify(formulario);
      if (this.assinatura && this.assinatura !== assinatura) throw new Error('A tentativa anterior ainda precisa ser conferida. Reenvie os mesmos dados ou confira a consulta antes de iniciar outra despesa.');
      let cliente = formulario.cliente_id;
      if (!cliente && formulario.destinatario_nome.trim()) {
        this.clienteCriado ??= await criarCliente(formulario.destinatario_nome.trim());
        cliente = this.clienteCriado;
      }
      this.chave ??= crypto.randomUUID(); this.assinatura = assinatura;
      return await salvar({ ...formulario, cliente_id: cliente, chave_requisicao: this.chave });
    } finally { this.emCurso = false; }
  }
}

-- Comentários: só o autor edita e apaga o que escreveu.
--
-- Esconder os botões no ecrã não chega — quem tenha a chave pública edita
-- na mesma pela API. E agora existe uma conta de demonstração a circular.
--
-- Ler e escrever continua a ser de quem tem acesso ao cartão; o que fica
-- restrito é MEXER no que já foi dito. `autor_id` guarda o id de autenticação,
-- por isso compara-se diretamente com quem está a pedir.

DROP POLICY IF EXISTS cartao_comentarios_acesso ON public.cartao_comentarios;
DROP POLICY IF EXISTS cartao_comentarios_auth   ON public.cartao_comentarios;

-- Ver: qualquer pessoa com acesso ao cartão.
CREATE POLICY cartao_comentarios_ver ON public.cartao_comentarios
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.quadro_cartoes c
                  WHERE c.id = cartao_comentarios.cartao_id
                    AND user_has_empresa_access(c.empresa_id)));

-- Escrever: idem, mas só em nome próprio. Sem esta verificação do autor,
-- alguém podia deixar um comentário assinado por outra pessoa.
CREATE POLICY cartao_comentarios_criar ON public.cartao_comentarios
  FOR INSERT TO authenticated
  WITH CHECK (autor_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.quadro_cartoes c
                 WHERE c.id = cartao_comentarios.cartao_id
                   AND user_has_empresa_access(c.empresa_id)));

-- Editar e apagar: só o autor.
CREATE POLICY cartao_comentarios_editar ON public.cartao_comentarios
  FOR UPDATE TO authenticated
  USING (autor_id = auth.uid())
  WITH CHECK (autor_id = auth.uid());

CREATE POLICY cartao_comentarios_apagar ON public.cartao_comentarios
  FOR DELETE TO authenticated
  USING (autor_id = auth.uid());

-- Nota: as entradas de ATIVIDADE (tipo='atividade') são escritas pelo sistema
-- em nome de quem agiu, portanto passam na regra de criação. Como o ecrã não
-- oferece botões nelas e o autor é quem praticou o ato, ficam na prática
-- inalteráveis por terceiros — que é o comportamento certo para um registo.

DROP POLICY IF EXISTS sel_subempreiteiros ON public.subempreiteiros;
DROP POLICY IF EXISTS ins_subempreiteiros ON public.subempreiteiros;
DROP POLICY IF EXISTS upd_subempreiteiros ON public.subempreiteiros;
DROP POLICY IF EXISTS del_subempreiteiros ON public.subempreiteiros;

CREATE POLICY "Authenticated users can view subempreiteiros" ON public.subempreiteiros FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert subempreiteiros" ON public.subempreiteiros FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update subempreiteiros" ON public.subempreiteiros FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete subempreiteiros" ON public.subempreiteiros FOR DELETE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS sel_sub_docs ON public.subempreiteiros_documentos;
DROP POLICY IF EXISTS ins_sub_docs ON public.subempreiteiros_documentos;
DROP POLICY IF EXISTS upd_sub_docs ON public.subempreiteiros_documentos;
DROP POLICY IF EXISTS del_sub_docs ON public.subempreiteiros_documentos;

CREATE POLICY "Authenticated users can view sub docs" ON public.subempreiteiros_documentos FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert sub docs" ON public.subempreiteiros_documentos FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update sub docs" ON public.subempreiteiros_documentos FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete sub docs" ON public.subempreiteiros_documentos FOR DELETE USING (auth.uid() IS NOT NULL);
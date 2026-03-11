import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { Building2, Users, Palette, Settings } from 'lucide-react';

export default function ConfigEmpresas() {
  const { empresas } = useEmpresa();

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Empresas</h1>
          <p className="text-muted-foreground text-sm">Empresas registadas no sistema Liberty</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Logo</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Cor</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {empresas.map(emp => (
                <TableRow key={emp.id}>
                  <TableCell>
                    <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{emp.nome}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{emp.slug}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded border" style={{ backgroundColor: emp.corPrimaria }} />
                      <span className="text-xs font-mono text-muted-foreground">{emp.corPrimaria}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Ativa</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {empresas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhuma empresa registada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

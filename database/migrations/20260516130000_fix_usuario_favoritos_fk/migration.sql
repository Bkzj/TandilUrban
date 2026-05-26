-- Corrige FKs invertidas: Prisma usa A=Propiedad, B=User (orden alfabético).
DROP TABLE IF EXISTS "_UsuarioFavoritos";

CREATE TABLE "_UsuarioFavoritos" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UsuarioFavoritos_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE INDEX "_UsuarioFavoritos_B_index" ON "_UsuarioFavoritos"("B");

ALTER TABLE "_UsuarioFavoritos" ADD CONSTRAINT "_UsuarioFavoritos_A_fkey" FOREIGN KEY ("A") REFERENCES "Propiedad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_UsuarioFavoritos" ADD CONSTRAINT "_UsuarioFavoritos_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

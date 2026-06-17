SELECT id, nome, email, status
FROM usuarios
WHERE id = 1;

UPDATE usuarios
SET status = 'aprovado'
WHERE id = 1;

INSERT OR IGNORE INTO sindicos (id)
VALUES (1);

SELECT u.id, u.nome, u.email, u.status, s.id AS sindico_id
FROM usuarios u
LEFT JOIN sindicos s ON s.id = u.id
WHERE u.id = 1;
const fs = require('fs')

const viewPath = '/Volumes/Adriel-SSD/Evangelista & Co/Evangelista & Co/Clientes/BUAP/Coordinación SS-PP (Admon)/Codigo/Azure-BUAP-Express/frontend/src/pages/student/ValidatorView.tsx'
let viewContent = fs.readFileSync(viewPath, 'utf8')

// Add folio state, etc.

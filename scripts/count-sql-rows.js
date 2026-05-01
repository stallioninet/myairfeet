import fs from 'fs'

const sql = fs.readFileSync('E:/xmapp/htdocs/523app/co523.sql', 'utf-8')

function countRows(tableName) {
  const re = new RegExp(`INSERT INTO \`${tableName}\`\\s*\\([^)]+\\)\\s*VALUES`, 'g')
  let total = 0, m
  while ((m = re.exec(sql)) !== null) {
    let pos = m.index + m[0].length, depth = 0, inStr = false, esc = false
    for (let i = pos; i < sql.length; i++) {
      const ch = sql[i]
      if (esc) { esc = false; continue }
      if (ch === '\\') { esc = true; continue }
      if (ch === "'") { inStr = !inStr; continue }
      if (inStr) continue
      if (ch === '(') { if (depth === 0) total++; depth++ }
      if (ch === ')') depth--
      if (ch === ';' && depth === 0) break
    }
  }
  return total
}

const tables = ['company', 'purchase_order', 'invoice_commission', 'invoice_commission_details', 'invoice_commission_item_details', 'invoice_commission_rep_details', 'invoice_payment', 'invoice_payment_rep', 'user_master', 'cust_sales_rep_map', 'airfeet_po', 'events', 'company_address', 'company_contact', 'po_item', 'po_item_total']
tables.forEach(t => console.log(t + ':', countRows(t), 'rows'))

export default function exportCSV(rows, headers, filename) {
  var csv = [headers].concat(rows).map(function(r) {
    return r.map(function(c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"' }).join(',')
  }).join('\n')
  var blob = new Blob([csv], { type: 'text/csv' })
  var u = URL.createObjectURL(blob)
  var link = document.createElement('a')
  link.href = u
  link.download = (filename || 'export') + '.csv'
  link.click()
  URL.revokeObjectURL(u)
}

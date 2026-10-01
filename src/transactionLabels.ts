export function transactionLabels(role: 'admin' | 'collaborator' | 'seller') {
    const admin = role === 'admin' || role === 'seller';
    return {
        action: admin ? 'Vender joya' : 'Comprar joya',
        tab: admin ? 'Venta por QR' : 'Compra por QR',
        title: admin ? 'Escanear y vender' : 'Escanear y comprar',
        noun: admin ? 'venta' : 'compra',
        progress: admin ? 'Registrando venta…' : 'Registrando compra…',
        success: admin ? 'Venta registrada correctamente' : 'Compra registrada correctamente',
        next: admin ? 'Nueva venta' : 'Nueva compra',
        unit: admin ? 'Una unidad vendida' : 'Una unidad comprada',
    };
}

// Hide the complete car, including its separately rendered antenna tip.
export function hideVehicleForScreen(game)
{
    const vehicle = game.world.visualVehicle
    const parts = [vehicle.parts.chassis, vehicle.antenna?.head].filter(Boolean)
    const visibility = parts.map(part => part.visible)
    parts.forEach(part => { part.visible = false })
    return () => parts.forEach((part, index) => { part.visible = visibility[index] })
}

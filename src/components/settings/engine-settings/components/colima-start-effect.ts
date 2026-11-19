export function colimaStartEffect(
  otherEngineName: string,
  activatesDockerContext: boolean
) {
  if (activatesDockerContext) {
    return `Starting it switches Nookat and docker commands in your terminal from ${otherEngineName} to Colima.`;
  }
  return `This Colima profile does not switch the Docker context when it starts, so Nookat and docker commands in your terminal stay on ${otherEngineName} until you switch them to Colima.`;
}

export function acceptEndTurnConfirmation(page) {
  page.on("dialog", async (dialog) => {
    if (dialog.type() === "confirm" && dialog.message() === "End your turn?") await dialog.accept();
    else await dialog.dismiss();
  });
}

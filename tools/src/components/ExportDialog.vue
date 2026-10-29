<script setup lang="ts">
import { computed, ref } from "vue";
import { exportCode } from "../domain/review";
import { useStore } from "../store";

const store = useStore();
const dialog = ref<HTMLDialogElement>();
const code = ref<HTMLTextAreaElement>();
const message = ref("");
const writing = ref(false);
const text = computed(() => exportCode(store.exportItems.value));

function open() {
  message.value = "";
  dialog.value?.showModal();
}

// écrit directement dans site/src/data/shifumi.json, par l'API du serveur de dev
async function write() {
  writing.value = true;
  try {
    message.value = await store.writeExport();
  } catch (e) {
    message.value = `Échec : ${e instanceof Error ? e.message : String(e)}`;
  } finally {
    writing.value = false;
  }
}

async function copy() {
  try {
    await navigator.clipboard.writeText(text.value);
    message.value = "Copié ✓";
  } catch {
    code.value?.select();
    message.value = "Sélectionné — fais Ctrl+C";
  }
}

defineExpose({ open });
</script>

<template>
  <dialog ref="dialog" class="export">
    <div class="dlg-head">
      <strong>Duels à écrire dans <code>shifumi.json</code></strong>
      <button class="close" aria-label="Fermer" @click="dialog?.close()">✕</button>
    </div>
    <div>
      <p class="sub" style="margin: 0">
        « Enregistrer » les écrit directement dans <code>site/src/data/shifumi.json</code> : les nouveaux sont ajoutés,
        les duels déjà présents et modifiés sont remplacés. Sinon, copie-les dans le tableau <code>matches</code> à la
        main.
      </p>
      <textarea ref="code" :value="text" readonly></textarea>
      <div class="actions">
        <button class="btn primary" :disabled="writing || !store.exportItems.value.length" @click="write">
          Enregistrer
        </button>
        <button class="btn" @click="copy">Copier</button>
        <span class="meta-line">{{ message }}</span>
      </div>
    </div>
  </dialog>
</template>

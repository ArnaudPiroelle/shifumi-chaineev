<script setup lang="ts">
import { GITHUB_REPO } from "../config";
import { newIssueUrl } from "../domain/report";

const issueUrl = newIssueUrl(GITHUB_REPO);
</script>

<template>
  <section id="erreur" class="card report">
    <h2>Vous constatez une erreur ?</h2>
    <p>
      Les chifoumis sont relevés à la main à partir des vidéos : un coup mal noté, un extrait qui démarre trop tard ou
      un duel oublié, ça peut arriver. Vous pouvez le signaler sur GitHub (un compte gratuit suffit).
    </p>
    <p>
      Le plus simple : ouvrez le duel concerné et cliquez sur <strong>⚑ Signaler une erreur</strong>. Le formulaire
      arrive déjà rempli avec la vidéo et les timestamps, il ne reste qu'à expliquer ce qui ne va pas.
    </p>
    <p>Pour un chifoumi qui manque au classement, utilisez le formulaire vierge :</p>
    <a class="btn-report" :href="issueUrl" target="_blank" rel="noopener">Signaler sur GitHub ↗</a>
  </section>
</template>

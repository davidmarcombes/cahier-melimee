const data = {
    masculine: {
        size: ["petit", "grand", "gentil", "super", "méga", "vif",
            "beau/bel", "joyeux", "fier", "brave", "jeune", "rapide"],
        animal: ["renard", "loup", "lion", "ours", "cerf", "écureuil", "chiot",
            "chaton", "canard", "tigre", "panda", "singe", "pingouin",
            "hibou", "pinson", "dauphin", "lapin", "guépard", "cheval",
            "dragon", "épervier", "faucon", "lama", "koala", "castor",
            "léopard", "faon", "hérisson", "poussin", "bourdon",
            "manchot", "colibri", "suricate", "aigle", "milan",
            "torillon", "chamois", "crabe", "oiseau"],
        trait: ["roux", "gris", "bleu", "noir", "blanc", "jaune", "sage", "fort", "paisible",
            "travailleur", "courageux", "doré", "invincible", "rieur", "magique", "rigolo",
            "agile", "calme", "mignon", "vaillant", "généreux", "étincelant", "marrant",
            "brillant", "habile", "méticuleux", "malin", "discret"]
    },
    feminine: {
        size: ["petite", "grande", "gentille", "super", "méga", "vive", "belle", "joyeuse", "fière"],
        animal: ["chouette", "souris", "panthère", "tortue", "biche", "belette",
            "mésange", "poulette", "chèvre", "girafe", "pie", "gazelle",
            "abeille", "coccinelle", "libellule", "lionne", "hermine",
            "hirondelle", "loutre", "fourmi", "louve", "lapine", "chenille",
            "colombe", "marmotte", "pieuvre", "oiselle", "cigale",
            "tourterelle", "écrevisse", "crevette"],
        trait: ["bleue", "verte", "rose", "jaune", "dorée", "rapide", "rusée", "maligne",
            "rieuse", "magique", "douce", "lumineuse", "coquine", "agile", "discrète",
            "brillante", "extra", "étonnante", "étincelante", "scintillante", "marrante", "rigolote",
            "travailleuse", "méticuleuse", "farceuse", "calme", "habile", "loyale", "paisible", "vaillante"]
    }
};

function startsWithVowel(word) {
    const vowels = 'aeiouyàâäéèêëîïôöûüÿh';
    return vowels.includes(word[0].toLowerCase());
}

function getVariant(adj, nextWord) {
    if (adj.includes('/')) {
        const [normal, beforeVowel] = adj.split('/');
        return startsWithVowel(nextWord) ? beforeVowel : normal;
    }
    return adj;
}

function generateIdentities(data) {
    let results = ["name,gender,usage_count,max_usage"]; // CSV Header

    // Process Masculine
    data.masculine.size.forEach(s => {
        data.masculine.animal.forEach(a => {
            const size = getVariant(s, a);
            data.masculine.trait.forEach(t => {
                results.push(`${size}-${a}-${t},M,0,20`);
            });
        });
    });

    // Process Feminine
    data.feminine.size.forEach(s => {
        data.feminine.animal.forEach(a => {
            data.feminine.trait.forEach(t => {
                results.push(`${s}-${a}-${t},F,0,20`);
            });
        });
    });

    return results.join("\n");
}

// Execution
const csvOutput = generateIdentities(data);
console.log(csvOutput);
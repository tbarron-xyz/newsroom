import { DailyEdition } from "../schemas/types";

export interface PerspectivePairEntry {
  label: string;
  prompt: string;
}

export interface PerspectivePair {
  id: string;
  name: string;
  left: PerspectivePairEntry;
  right: PerspectivePairEntry;
}

export interface PrismResult {
  label: string;
  content: DailyEdition;
}

export const PERSPECTIVE_PAIRS: PerspectivePair[] = [
  {
    id: "israeli-media",
    name: "Israeli News Media Perspectives",
    left: {
      label: "Israeli Centrist",
      prompt: `Israeli centrist newspaper (Ynet, Haaretz English edition) — reports the conflict with an emphasis on Israeli security concerns, civilian casualties from rocket attacks, the threat posed by Hamas and Hezbollah, the imperative of deterrence, and the moral dilemmas of a democratic state defending itself. Uses terms like 'terrorists,' 'rocket barrages,' 'Iron Dome interceptions,' 'IDF operations,' 'hostage rescue.' Gives significant weight to statements from Israeli government and military officials. Frames Palestinian civilian casualties as tragic but ultimately caused by Hamas embedding military assets in civilian areas.`
    },
    right: {
      label: "Palestinian / Arabic",
      prompt: `Palestinian / Arabic-language perspective (Al Jazeera Arabic, WAFA news agency) — reports the conflict with an emphasis on Palestinian suffering under occupation, civilian casualties from Israeli airstrikes, the destruction of homes and infrastructure, the humanitarian crisis in Gaza, and the legitimacy of resistance against military occupation. Uses terms like 'occupation forces,' 'apartheid,' 'siege,' 'massacre,' 'settler colonialism,' 'war crimes.' Gives significant weight to statements from Palestinian Authority officials, Hamas spokespeople, and UN humanitarian agencies. Frames Israeli civilian deaths as the inevitable consequence of occupation.`
    }
  },
  {
    id: "diplomatic-framings",
    name: "International Diplomatic Framings",
    left: {
      label: "European Union",
      prompt: `European Union foreign policy establishment — approaches the conflict through the lens of international law, UN resolutions, the two-state solution, and humanitarian concern. Emphasises the illegality of settlements under international law, the need for ceasefire negotiations, the importance of the International Court of Justice and ICC. Uses measured, diplomatic language: 'deeply concerned,' 'calls for restraint,' 'emphasises the need for a political solution.' Expresses equal concern for civilian lives on both sides. Favours multilateral frameworks and EU-mediated negotiations.`
    },
    right: {
      label: "US Republican / Neoconservative",
      prompt: `US Republican foreign policy / neoconservative perspective (Fox News, Wall Street Journal opinion) — frames the conflict as part of a broader struggle between Western civilisation and Iran-backed Islamist extremism. Emphasises Israel's right to self-defence, the existential threat from Iran's nuclear programme and proxy forces, and the strategic value of the US-Israel alliance. Portrays Hamas, Hezbollah, and the Houthis as Iranian proxies. Uses terms like 'axis of resistance,' 'terrorist infrastructure,' 'decisive force.' Critical of UN and international bodies as biased against Israel. Frames Palestinian leadership as corrupt and rejectionist.`
    }
  },
  {
    id: "global-south",
    name: "Non-aligned / Global South Perspectives",
    left: {
      label: "Indian Strategic",
      prompt: `Indian strategic establishment perspective — views the conflict through India's own experience with cross-border terrorism and its growing ties with Israel (defence, technology, intelligence). Sympathetic to Israel's security dilemmas while maintaining official support for the Palestinian cause. Uses the language of 'fight against terrorism' and 'sovereign right to self-defence.' Compares Hamas to cross-border terror groups India faces. However, also acknowledges Palestinian aspirations given India's own anti-colonial history and large Muslim population. Nuanced — supports two-state solution but rejects one-sided condemnations.`
    },
    right: {
      label: "South African / ANC",
      prompt: `South African ruling-party perspective (ANC, Mail & Guardian left-leaning) — draws direct parallels between the Israeli occupation of Palestinian territories and the apartheid system in South Africa. Uses the term 'apartheid' as the primary framing device. Emphasises international law, the ICJ genocide case, boycott/divestment/sanctions (BDS) as a legitimate tactic. Frames Palestinian resistance as analogous to the ANC's own anti-apartheid struggle. Gives platform to Palestinian voices and human rights organisations. Critical of Western governments for enabling what it frames as Israeli impunity.`
    }
  },
  {
    id: "domestic-political",
    name: "Domestic Political Perspectives Within Israel/Palestine",
    left: {
      label: "Israeli Settler / Religious Zionist",
      prompt: `Israeli settler / religious Zionist perspective (Arutz Sheva, national religious media) — frames the West Bank (Judea and Samaria) as the Biblical heartland of the Jewish people, with settlement as a national and religious imperative. Views the conflict through a theological lens of divine promise and redemption. Opposition to Palestinian statehood on grounds of both security and religious principle. Uses terms like 'our ancestral homeland,' 'Jewish birthright,' 'miraculous return.' Sceptical of security establishment warnings. Sees evacuation of settlements as a catastrophe (referencing Gaza disengagement). Portrays Palestinians as implacable enemies who only understand strength.`
    },
    right: {
      label: "Palestinian Diaspora / NGO",
      prompt: `Palestinian diaspora / human rights NGO perspective (Al-Haq, Amnesty International, B'Tselem) — frames the conflict through international humanitarian law, documented human rights abuses, and eyewitness testimony from affected civilians. Uses terms like 'collective punishment,' 'forced displacement,' 'administrative detention,' 'demographic engineering.' Emphasises documentation and data — casualty counts, demolition orders, detention figures, settler violence statistics. Calls for accountability through international mechanisms (ICC, UNHRC). Rejects both armed resistance and occupation. Urges third countries to suspend arms sales and impose sanctions. Centres Palestinian civilian experience and agency.`
    }
  }
];

import xlrd
import json


cc_cedict_json = {}
with open('cc-cedict-parsed.json') as json_file:
    data = json.load(json_file)
    cc_cedict_json = data


def parse_dictionary_data():
    dictionary_data = {"char": {}, "radicals": {}}
    with open("dictionary.txt") as f:
        line = f.readline()
        while line:
            parsedDict = json.loads(line)

            ch = parsedDict["character"]
            radical = ""
            if "radical" in parsedDict.keys():
                radical = parsedDict["radical"]

            definition = ""
            if "definition" in parsedDict.keys():
                definition = parsedDict["definition"]

            pinyin = ""
            if "pinyin" in parsedDict.keys():
                pinyin = parsedDict["pinyin"]

            dictionary_data["char"][ch] = {}
            dictionary_data["char"][ch]["definition"] = definition
            dictionary_data["char"][ch]["radical"] = radical
            dictionary_data["char"][ch]["pinyin"] = pinyin

            if radical != "":
                if radical not in dictionary_data["radicals"].keys():
                    dictionary_data["radicals"][radical] = {
                        "definition": "", "words": []}

                if ch == radical:
                    dictionary_data["radicals"][radical]["definition"] = definition

                dictionary_data["radicals"][radical]["words"].append(ch)

            line = f.readline()
    return dictionary_data


# Give the location of the file
loc = ("SUBTLEX-CH-WF.xlsx")

# To open Workbook
wb = xlrd.open_workbook(loc)
sheet = wb.sheet_by_index(0)

# each char should have frequency and which phrases it is in
# "你": {
#	total_fr: ...,
#	solo_fr: ...,
#	by_word: {"你的": ...},
#	by_other_char: {“的‘: ...}
# }
char_info = {}

# frequency of phrase
word_freq = {}


id_counter = 1
# 11505 as top end for all words w >= 100 counts
for r in range(3, 6003):

    if len(char_info.keys()) >= 400:
        print(r)
        break

    word = sheet.cell_value(r, 0)
    by_char = list(word)
    count = int(sheet.cell_value(r, 1))

    if word in word_freq.keys():
        print("duplicate found: ", word)
        continue

    # add word into word dictionary
    word_freq[word] = {"total_fr": count}

    if len(by_char) == 1:
        if by_char[0] not in char_info.keys():
            char_info[by_char[0]] = {
                "id": id_counter, "total_fr": 0, "solo_fr": 0, "by_word": {}, "by_other_char": {}}
            id_counter += 1

        char_info[by_char[0]]["total_fr"] += count
        char_info[by_char[0]]["solo_fr"] = count
        continue

    # add new characters into character dictionary if needed
    for i in range(len(by_char)):
        if by_char[i] not in char_info.keys():
            char_info[by_char[i]] = {
                "id": id_counter, "total_fr": 0, "solo_fr": 0, "by_word": {}, "by_other_char": {}}
            id_counter += 1

        char_info[by_char[i]]["total_fr"] += count
        char_info[by_char[i]]["by_word"][word] = count

    for i in range(len(by_char)):
        for j in range(i+1, len(by_char)):
            i_other_char = char_info[by_char[i]]["by_other_char"]
            j_other_char = char_info[by_char[j]]["by_other_char"]

            # update char counts for both
            if by_char[j] not in i_other_char:
                i_other_char[by_char[j]] = 0
            if by_char[i] not in j_other_char:
                j_other_char[by_char[i]] = 0

            i_other_char[by_char[j]] += count
            j_other_char[by_char[i]] += count

dictionary_data = parse_dictionary_data()

for c in char_info.keys():
    char_info[c]["definition"] = ""
    char_info[c]["radical"] = ""
    char_info[c]["pinyin"] = ""
    if c in dictionary_data["char"].keys():
        dict_char_info = dictionary_data["char"][c]
        char_info[c]["definition"] = dict_char_info["definition"]
        char_info[c]["radical"] = dict_char_info["radical"]
        # char_info[c]["pinyin"] = dict_char_info["pinyin"]
    else:
        print("not found: ", c)

    if c in cc_cedict_json.keys():
        dict_char_info = cc_cedict_json[c]
        char_info[c]["pinyin"] = "/".join(dict_char_info["pinyin"])
    else:
        print("char not found in second dict: ", c)

for w in word_freq.keys():
    word_freq[w]["definition"] = ""
    word_freq[w]["pinyin"] = ""
    if w in cc_cedict_json.keys():
        dict_char_info = cc_cedict_json[w]
        word_freq[w]["definition"] = dict_char_info["english"]
        word_freq[w]["pinyin"] = dict_char_info["pinyin"]
    else:
        print("not found word: ", w)

# only keep radicals that appear in commonly used words
filtered_radicals = {}

for r in dictionary_data["radicals"].keys():
    filtered_char = []
    for c in dictionary_data["radicals"][r]["words"]:
        if c in char_info.keys():
            filtered_char.append(c)

    if len(filtered_char) > 0:
        filtered_radicals[r] = {
            "definition": dictionary_data["radicals"][r]["definition"], "words": filtered_char}

all_data = {"char": char_info, "radical": filtered_radicals, "word": word_freq}

# with open("char_radical_data_400.json", "w") as all_out:
#     json.dump(all_data, all_out, ensure_ascii=False)

# with open("character_info.json", "w") as char_out:
#     json.dump(char_info, char_out, ensure_ascii=False)

# with open("word_info.json", "w") as word_out:
#     json.dump(word_freq, word_out, ensure_ascii=False)


# generate graph data (nodes, links) file

data = {"nodes": [], "links": []}
id_to_char = {}
char_to_id = {}

for c in char_info.keys():
    idx = char_info[c]["id"]
    id_to_char[idx] = c
    char_to_id[c] = idx

    data["nodes"].append(
        {"id": idx, "name": c})

for char_1 in char_info.keys():
    other_char_dict = char_info[char_1]["by_other_char"]
    for char_2 in other_char_dict.keys():

        id_1 = char_to_id[char_1]
        id_2 = char_to_id[char_2]

        word_source = []
        for w in char_info[char_1]["by_word"].keys():
            if char_1 in w and char_2 in w:
                word_source.append(w)

        # undirected, so source/target doesn't matter. choose source based on id value so link not added twice
        if id_1 < id_2:
            data["links"].append(
                {"source": id_1, "target": id_2, "value": other_char_dict[char_2], "link_origin": word_source})
        elif id_2 > id_1:
            data["links"].append(
                {"source": id_2, "target": id_1, "value": other_char_dict[char_2], "link_origin": word_source})

with open("graph_data_400.json", "w") as graph_data_out:
    json.dump(data, graph_data_out, ensure_ascii=False)
